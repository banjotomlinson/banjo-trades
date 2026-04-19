-- Trades table (P&L journal entries)
create table if not exists public.trades (
  id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  pnl numeric(12,2) not null,
  note text,
  created_at timestamptz default now(),
  primary key (user_id, id)
);

create index idx_trades_user_date on public.trades (user_id, date);

alter table public.trades enable row level security;

create policy "Users can view own trades"
  on public.trades for select using (auth.uid() = user_id);
create policy "Users can insert own trades"
  on public.trades for insert with check (auth.uid() = user_id);
create policy "Users can update own trades"
  on public.trades for update using (auth.uid() = user_id);
create policy "Users can delete own trades"
  on public.trades for delete using (auth.uid() = user_id);

-- Gallery images metadata (files stored in Supabase Storage)
create table if not exists public.gallery_images (
  id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  storage_path text not null,
  created_at timestamptz default now(),
  primary key (user_id, id)
);

alter table public.gallery_images enable row level security;

create policy "Users can view own gallery images"
  on public.gallery_images for select using (auth.uid() = user_id);
create policy "Users can insert own gallery images"
  on public.gallery_images for insert with check (auth.uid() = user_id);
create policy "Users can delete own gallery images"
  on public.gallery_images for delete using (auth.uid() = user_id);

-- Add sidebar preference to profiles
alter table public.profiles
  add column if not exists sidebar_collapsed boolean default true;
