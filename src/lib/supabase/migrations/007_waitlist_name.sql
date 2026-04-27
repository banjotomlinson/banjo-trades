-- Add a name column to the waitlist signup form. Nullable so any existing
-- rows aren't broken; the landing form makes it required client-side.
alter table public.waitlist_signups
  add column if not exists name text;
