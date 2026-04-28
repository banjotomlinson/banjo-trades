-- Approval gate for new sign-ins. The auth callback writes approved_at
-- once we've verified the user is in the first 100 waitlist spots (or is
-- an admin). Existing users get backfilled so they're grandfathered in.

alter table public.profiles
  add column if not exists approved_at timestamptz;

-- Grandfather every account that already exists.
update public.profiles
  set approved_at = created_at
  where approved_at is null;

create index if not exists profiles_approved_idx on public.profiles(approved_at);
