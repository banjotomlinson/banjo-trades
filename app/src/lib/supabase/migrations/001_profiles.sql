-- Profiles table (auto-created on sign-up via trigger)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text default 'auto',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User theme preferences
create table if not exists public.user_theme (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preset text default 'default',
  bg_page text default '#0a0e17',
  bg_panel text default '#111827',
  bg_border text default '#1e293b',
  accent_primary text default '#3b82f6',
  accent_success text default '#22c55e',
  accent_danger text default '#ef4444',
  accent_warning text default '#f59e0b',
  session_asia text default '#a855f7',
  session_london text default '#3b82f6',
  session_ny text default '#22c55e',
  updated_at timestamptz default now()
);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.user_theme enable row level security;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Users can view own theme" on public.user_theme for select using (auth.uid() = user_id);
create policy "Users can update own theme" on public.user_theme for update using (auth.uid() = user_id);
create policy "Users can insert own theme" on public.user_theme for insert with check (auth.uid() = user_id);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  insert into public.user_theme (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
