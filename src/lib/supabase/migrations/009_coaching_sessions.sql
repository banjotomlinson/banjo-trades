-- 1-on-1 coaching / consulting bookings.
-- Every TraderM8 account gets one free 30-minute session. Subsequent
-- bookings go through Stripe Checkout (status starts 'pending', flips to
-- 'confirmed' on webhook receipt).
--
-- Slots run 09:00–19:00 (last slot 18:30) in the timezone configured via the
-- COACHING_TIMEZONE env var on the server. We do NOT enforce that bound at
-- the DB level — the server validates before insert — because timezone math
-- in pure SQL is fragile when the configured TZ may differ across deploys.

create table if not exists public.coaching_sessions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  starts_at             timestamptz not null,
  duration_minutes      int  not null default 30,
  status                text not null default 'pending'
                              check (status in ('pending','confirmed','cancelled','completed')),
  is_free_session       bool not null default false,
  amount_cents          int,
  currency              text default 'gbp',
  stripe_checkout_id    text,
  stripe_payment_intent text,
  contact_email         text,
  topic                 text,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- One booking per slot (only counting live bookings — cancelled/completed
-- rows must not block the time being re-listed).
create unique index if not exists coaching_sessions_slot_live_uniq
  on public.coaching_sessions (starts_at)
  where status in ('pending','confirmed');

create index if not exists coaching_sessions_user_idx
  on public.coaching_sessions (user_id, starts_at desc);

create index if not exists coaching_sessions_starts_idx
  on public.coaching_sessions (starts_at);

-- Convenience: has the user already used (or holds) their free session?
-- Cancelled rows do not count, so a user who cancels still has the freebie.
create or replace function public.user_has_free_session_left(uid uuid)
returns boolean
language sql
stable
as $$
  select not exists (
    select 1
      from public.coaching_sessions
     where user_id = uid
       and is_free_session = true
       and status in ('pending','confirmed','completed')
  );
$$;

-- ── RLS ──────────────────────────────────────────────────────────
alter table public.coaching_sessions enable row level security;

-- Users see their own bookings.
drop policy if exists "coaching read own" on public.coaching_sessions;
create policy "coaching read own"
  on public.coaching_sessions for select
  using (auth.uid() = user_id);

-- Users can update their own bookings (used to cancel pending).
drop policy if exists "coaching update own" on public.coaching_sessions;
create policy "coaching update own"
  on public.coaching_sessions for update
  using (auth.uid() = user_id);

-- Inserts go via the service-role key on the API route, never directly
-- from the client — so no insert policy needed for end-users. Admins can
-- read/write everything.
drop policy if exists "coaching admin all" on public.coaching_sessions;
create policy "coaching admin all"
  on public.coaching_sessions for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Anonymous visitors on the marketing page need to know which slots are
-- already taken so we can grey them out. They should NOT see who booked
-- them. Expose just (starts_at, status) via a view.
create or replace view public.coaching_busy_slots as
  select starts_at
    from public.coaching_sessions
   where status in ('pending','confirmed');

grant select on public.coaching_busy_slots to anon, authenticated;
