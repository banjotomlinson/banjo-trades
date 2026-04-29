-- Pre-launch waitlist signups from the marketing landing page.
-- Anyone (anon) can submit. Only admins (banjotomlinson@gmail.com) can read,
-- so the responses stay private until launch.

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null check (length(email) between 5 and 200),
  primary_asset text,
  experience text,
  pain_point text,
  source text,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (email)
);

create index if not exists waitlist_signups_created_idx
  on public.waitlist_signups(created_at desc);

alter table public.waitlist_signups enable row level security;

-- Admins read everything for review.
drop policy if exists "waitlist admin read" on public.waitlist_signups;
create policy "waitlist admin read"
  on public.waitlist_signups for select
  using (public.is_admin(auth.uid()));

-- Anyone (auth'd or anon) can insert their own row. The unique(email)
-- constraint protects against accidental dupes.
drop policy if exists "waitlist public insert" on public.waitlist_signups;
create policy "waitlist public insert"
  on public.waitlist_signups for insert
  to anon, authenticated
  with check (true);

-- Admins can delete spam/test entries.
drop policy if exists "waitlist admin delete" on public.waitlist_signups;
create policy "waitlist admin delete"
  on public.waitlist_signups for delete
  using (public.is_admin(auth.uid()));
