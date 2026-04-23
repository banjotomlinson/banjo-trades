import { createClient } from "@supabase/supabase-js";

// ── Shared market-data cache ─────────────────────────────────────
// /api/yahoo and /api/refresh-market both flow through this module.
// Supabase is the single source of truth; Yahoo is only hit when a row
// is missing or stale. 1000 concurrent users → 1 row read each.

// Yahoo returns 403 to the default Node UA. Use a desktop-browser UA.
export const YAHOO_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// How long a cache entry is considered fresh. Picked per interval so
// shorter-timeframe data refreshes more often. Cron runs every 2 min so
// these TTLs should be slightly larger than that.
export const TTL_MS: Record<string, number> = {
  "1m": 90_000,
  "2m": 120_000,
  "5m": 180_000,
  "15m": 5 * 60_000,
  "30m": 10 * 60_000,
  "60m": 10 * 60_000,
  "90m": 15 * 60_000,
  "1h": 10 * 60_000,
  "1d": 30 * 60_000,
  "5d": 60 * 60_000,
  "1wk": 6 * 60 * 60_000,
  "1mo": 12 * 60 * 60_000,
  "3mo": 24 * 60 * 60_000,
};

// Every (symbol, interval, range) combo the dashboard actually requests.
// Cron pre-warms exactly these rows. Add a new entry here when a new
// instrument goes into any dashboard component.
export const HOT_SYMBOLS: { symbol: string; interval: string; range: string }[] = [
  // MarketsSnapshot (bias cards)
  { symbol: "NQ=F", interval: "1d", range: "1y" },
  { symbol: "NQ=F", interval: "1h", range: "1mo" },
  { symbol: "GC=F", interval: "1d", range: "1y" },
  { symbol: "GC=F", interval: "1h", range: "1mo" },
  { symbol: "BTC-USD", interval: "1d", range: "1y" },
  { symbol: "BTC-USD", interval: "1h", range: "1mo" },
  { symbol: "EURUSD=X", interval: "1d", range: "1y" },
  { symbol: "EURUSD=X", interval: "1h", range: "1mo" },
  // SessionLevels — 5m x 5d for both legs of each mode
  { symbol: "NQ=F", interval: "5m", range: "5d" },
  { symbol: "ES=F", interval: "5m", range: "5d" },
  { symbol: "GC=F", interval: "5m", range: "5d" },
  { symbol: "CL=F", interval: "5m", range: "5d" },
  { symbol: "EURUSD=X", interval: "5m", range: "5d" },
  { symbol: "GBPUSD=X", interval: "5m", range: "5d" },
  { symbol: "BTC-USD", interval: "5m", range: "5d" },
  { symbol: "ETH-USD", interval: "5m", range: "5d" },
  // MoversPanel — 1y daily for every instrument
  { symbol: "ES=F", interval: "1d", range: "1y" },
  { symbol: "YM=F", interval: "1d", range: "1y" },
  { symbol: "RTY=F", interval: "1d", range: "1y" },
  { symbol: "SI=F", interval: "1d", range: "1y" },
  { symbol: "CL=F", interval: "1d", range: "1y" },
  { symbol: "NG=F", interval: "1d", range: "1y" },
  { symbol: "HG=F", interval: "1d", range: "1y" },
  { symbol: "PL=F", interval: "1d", range: "1y" },
  { symbol: "ETH-USD", interval: "1d", range: "1y" },
  { symbol: "SOL-USD", interval: "1d", range: "1y" },
  { symbol: "BNB-USD", interval: "1d", range: "1y" },
  { symbol: "XRP-USD", interval: "1d", range: "1y" },
  { symbol: "ADA-USD", interval: "1d", range: "1y" },
  { symbol: "DOGE-USD", interval: "1d", range: "1y" },
  { symbol: "DOT-USD", interval: "1d", range: "1y" },
  { symbol: "GBPUSD=X", interval: "1d", range: "1y" },
  { symbol: "USDJPY=X", interval: "1d", range: "1y" },
  { symbol: "AUDUSD=X", interval: "1d", range: "1y" },
  { symbol: "USDCAD=X", interval: "1d", range: "1y" },
  { symbol: "NZDUSD=X", interval: "1d", range: "1y" },
  { symbol: "USDCHF=X", interval: "1d", range: "1y" },
];

interface CacheRow {
  symbol: string;
  interval: string;
  range: string;
  payload: unknown;
  fetched_at: string;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface CacheResult {
  payload: unknown;
  fetchedAt: string | null;
  source: "cache-fresh" | "cache-stale" | "upstream" | "cache-fallback";
}

export async function fetchYahooDirect(
  symbol: string,
  interval: string,
  range: string
): Promise<unknown> {
  const upstream = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=${interval}&range=${range}`;
  const res = await fetch(upstream, {
    headers: { "User-Agent": YAHOO_UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`yahoo ${res.status}`);
  }
  return res.json();
}

async function upsertRow(
  symbol: string,
  interval: string,
  range: string,
  payload: unknown
) {
  const supa = getServiceClient();
  if (!supa) return; // no service role — skip cache write (dev without backend keys)
  await supa.from("market_candles").upsert(
    {
      symbol,
      interval,
      range,
      payload,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "symbol,interval,range" }
  );
}

async function readRow(
  symbol: string,
  interval: string,
  range: string
): Promise<CacheRow | null> {
  const supa = getServiceClient();
  if (!supa) return null;
  const { data } = await supa
    .from("market_candles")
    .select("symbol, interval, range, payload, fetched_at")
    .eq("symbol", symbol)
    .eq("interval", interval)
    .eq("range", range)
    .maybeSingle();
  return (data as CacheRow | null) ?? null;
}

function isFresh(fetchedAt: string, interval: string): boolean {
  const ttl = TTL_MS[interval] ?? 5 * 60_000;
  const age = Date.now() - new Date(fetchedAt).getTime();
  return age < ttl;
}

// Main entry for /api/yahoo. Returns cached payload when fresh, otherwise
// refreshes from Yahoo inline. On Yahoo failure, falls back to stale cache
// rather than erroring the UI.
export async function getCandles(
  symbol: string,
  interval: string,
  range: string
): Promise<CacheResult> {
  const row = await readRow(symbol, interval, range);
  if (row && isFresh(row.fetched_at, interval)) {
    return { payload: row.payload, fetchedAt: row.fetched_at, source: "cache-fresh" };
  }

  // Cache miss or stale — refresh from Yahoo.
  try {
    const payload = await fetchYahooDirect(symbol, interval, range);
    await upsertRow(symbol, interval, range, payload);
    return { payload, fetchedAt: new Date().toISOString(), source: "upstream" };
  } catch (err) {
    // If Yahoo is down but we have any row at all, serve the stale copy
    // rather than break the UI.
    if (row) {
      return {
        payload: row.payload,
        fetchedAt: row.fetched_at,
        source: "cache-fallback",
      };
    }
    throw err;
  }
}

// Used by the cron to unconditionally hit Yahoo and refresh a row.
export async function refreshRow(
  symbol: string,
  interval: string,
  range: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const payload = await fetchYahooDirect(symbol, interval, range);
    await upsertRow(symbol, interval, range, payload);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "failed" };
  }
}
