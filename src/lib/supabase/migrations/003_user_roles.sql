-- User roles. Backend-only field; never editable from the app.
-- Everyone defaults to 'user'. Only banjotomlinson@gmail.com is promoted to
-- 'admin' here. Future admin grants must happen via direct SQL — there is
-- no UI surface for changing the role.

-- Add role column (idempotent)
alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

-- Allow public read of profiles so display name + role are visible to the
-- whole app (needed for "Admin" badges next to names on the feedback board).
-- Permissive policies OR with the existing restrictive ones.
drop policy if exists "Profiles public read" on public.profiles;
create policy "Profiles public read"
  on public.profiles for select
  using (true);

-- Server-side helper used by future RLS policies that need to gate actions
-- by admin role. Not used in 003 alone but lives here so the role
-- machinery is self-contained.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
as $$
  select coalesce((select role = 'admin' from public.profiles where id = uid), false);
$$;

-- Promote the project owner. Anyone else stays a 'user' by default.
update public.profiles set role = 'admin'
where id in (select id from auth.users where email = 'banjotomlinson@gmail.com');
