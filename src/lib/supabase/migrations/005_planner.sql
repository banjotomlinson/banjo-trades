-- Trade planner: per-user plans with two parallel step lists
-- (steps = trade plan, risk = risk management). Stored as JSONB so the
-- ordering and step IDs come straight from the client, matching how the
-- local preview store has been shaping the data.

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New trade plan' check (length(title) <= 200),
  steps jsonb not null default '[]'::jsonb,
  risk jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plans_user_idx on public.plans(user_id);
create index if not exists plans_updated_idx on public.plans(updated_at desc);

-- Reuse the touch_updated_at() function created in 004_feedback.sql.
drop trigger if exists plans_touch_updated_at on public.plans;
create trigger plans_touch_updated_at
  before update on public.plans
  for each row execute function public.touch_updated_at();

-- RLS — every user only reads/writes their own plans.
alter table public.plans enable row level security;

drop policy if exists "plans select own" on public.plans;
create policy "plans select own" on public.plans for select
  using (auth.uid() = user_id);

drop policy if exists "plans insert own" on public.plans;
create policy "plans insert own" on public.plans for insert
  with check (auth.uid() = user_id);

drop policy if exists "plans update own" on public.plans;
create policy "plans update own" on public.plans for update
  using (auth.uid() = user_id);

drop policy if exists "plans delete own" on public.plans;
create policy "plans delete own" on public.plans for delete
  using (auth.uid() = user_id);
