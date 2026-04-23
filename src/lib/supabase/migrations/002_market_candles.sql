-- Shared market-data cache.
-- One row per (symbol, interval, range). All users read from the same row so
-- a dashboard load for user #1000 hits Yahoo the same number of times as
-- user #1 — zero. The /api/refresh-market cron keeps rows warm.

create table if not exists public.market_candles (
  id bigserial primary key,
  symbol text not null,
  interval text not null,
  range text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  unique (symbol, interval, range)
);

create index if not exists market_candles_lookup
  on public.market_candles(symbol, interval, range);

alter table public.market_candles enable row level security;

-- Cache is public read. Writes flow through the server using the service
-- role key, which bypasses RLS, so we deliberately do NOT add a write
-- policy for authenticated/anon.
drop policy if exists "market candles public read" on public.market_candles;
create policy "market candles public read"
  on public.market_candles for select
  using (true);
