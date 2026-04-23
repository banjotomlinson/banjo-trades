"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  useTradingMode,
  type TradingMode,
} from "@/components/providers/TradingModeProvider";

// ── Types ────────────────────────────────────────────────────────
interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Confluence {
  dir: "bull" | "bear";
  pts: number;
  text: string;
}

interface SnapshotInstrument {
  cat: Exclude<TradingMode, "all">;
  symbol: string;
  name: string;
  sub: string;
  color: string;
}

interface SnapshotEntry extends SnapshotInstrument {
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  conf: "HIGH" | "MEDIUM" | "LOW";
  bull: number;
  bear: number;
  confluences: Confluence[];
}

type MarketBadgeClass =
  | "open"
  | "premarket"
  | "london"
  | "overlap"
  | "asia"
  | "closed";

interface MarketSession {
  label: string;
  badgeClass: MarketBadgeClass;
}

// ── Constants ────────────────────────────────────────────────────
const SNAPSHOT_INSTRUMENTS: SnapshotInstrument[] = [
  { cat: "futures", symbol: "NQ=F", name: "Futures", sub: "NQ/ES Fut", color: "#f59e0b" },
  { cat: "commodities", symbol: "GC=F", name: "Commodities", sub: "Gold / Oil", color: "#22c55e" },
  { cat: "crypto", symbol: "BTC-USD", name: "Crypto", sub: "BTC / ETH", color: "#a855f7" },
  { cat: "forex", symbol: "EURUSD=X", name: "Forex", sub: "EUR/USD", color: "#06b6d4" },
];

const SNAPSHOT_TTL = 5 * 60 * 1000; // 5 minutes

const CONF_PCT: Record<string, string> = { HIGH: "86%", MEDIUM: "54%", LOW: "26%" };

const BADGE_STYLES: Record<MarketBadgeClass, string> = {
  open: "bg-green-500 text-black",
  premarket: "bg-blue-500 text-white",
  london: "bg-violet-500 text-white",
  overlap: "bg-amber-500 text-black",
  asia: "bg-cyan-500 text-black",
  closed: "bg-slate-600 text-slate-400",
};

// ── Yahoo Finance fetch ──────────────────────────────────────────
async function fetchCandles(ticker: string, tf: string): Promise<Candle[]> {
  let interval: string, range: string;
  if (tf === "1h") { interval = "1h"; range = "1mo"; }
  else { interval = "1d"; range = "1y"; }

  const url = `/api/yahoo?symbol=${encodeURIComponent(ticker)}&interval=${interval}&range=${range}`;

  const res = await fetch(url);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result?.timestamp) return [];

  const ts = result.timestamp;
  const q = result.indicators.quote[0];
  return ts
    .map((t: number, i: number) => ({
      time: t * 1000,
      open: q.open[i],
      high: q.high[i],
      low: q.low[i],
      close: q.close[i],
    }))
    .filter((c: Candle) => c.open && c.high && c.low && c.close);
}

// ── Lightweight ICT analysis (ported from monolith) ──────────────
function findSwings(candles: Candle[], lb: number) {
  const highs: { idx: number; price: number }[] = [];
  const lows: { idx: number; price: number }[] = [];

  for (let i = lb; i < candles.length - lb; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = 1; j <= lb; j++) {
      if (candles[i].high <= candles[i - j].high || candles[i].high <= candles[i + j].high) isHigh = false;
      if (candles[i].low >= candles[i - j].low || candles[i].low >= candles[i + j].low) isLow = false;
    }
    if (isHigh) highs.push({ idx: i, price: candles[i].high });
    if (isLow) lows.push({ idx: i, price: candles[i].low });
  }
  return { highs, lows };
}

function detectStructure(
  highs: { idx: number; price: number }[],
  lows: { idx: number; price: number }[]
): "bullish" | "bearish" | "neutral" {
  if (highs.length < 2 || lows.length < 2) return "neutral";
  const hh = highs[highs.length - 1].price > highs[highs.length - 2].price;
  const hl = lows[lows.length - 1].price > lows[lows.length - 2].price;
  const lh = highs[highs.length - 1].price < highs[highs.length - 2].price;
  const ll = lows[lows.length - 1].price < lows[lows.length - 2].price;
  if (hh && hl) return "bullish";
  if (lh && ll) return "bearish";
  return "neutral";
}

function findBOS(candles: Candle[], highs: { idx: number; price: number }[], lows: { idx: number; price: number }[]) {
  const results: { type: string }[] = [];
  if (highs.length >= 2) {
    const prev = highs[highs.length - 2].price;
    const last = candles[candles.length - 1];
    if (last.close > prev) results.push({ type: "bullish" });
  }
  if (lows.length >= 2) {
    const prev = lows[lows.length - 2].price;
    const last = candles[candles.length - 1];
    if (last.close < prev) results.push({ type: "bearish" });
  }
  return results;
}

function findCHoCH(candles: Candle[], highs: { idx: number; price: number }[], lows: { idx: number; price: number }[]) {
  const results: { type: string }[] = [];
  if (highs.length >= 2 && lows.length >= 2) {
    const wasDown = highs[highs.length - 2].price > highs[highs.length - 1].price;
    const hh = candles[candles.length - 1].close > highs[highs.length - 1].price;
    if (wasDown && hh) results.push({ type: "bullish" });
    const wasUp = lows[lows.length - 2].price < lows[lows.length - 1].price;
    const ll = candles[candles.length - 1].close < lows[lows.length - 1].price;
    if (wasUp && ll) results.push({ type: "bearish" });
  }
  return results;
}

function findMSS(candles: Candle[]) {
  const results: { type: string }[] = [];
  if (candles.length < 5) return results;
  const last3 = candles.slice(-3);
  if (last3[2].close > last3[1].high && last3[1].close < last3[0].close) results.push({ type: "bullish" });
  if (last3[2].close < last3[1].low && last3[1].close > last3[0].close) results.push({ type: "bearish" });
  return results;
}

function findDisplacement(candles: Candle[]) {
  const results: { type: string }[] = [];
  if (candles.length < 2) return results;
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const body = Math.abs(last.close - last.open);
  const avgBody =
    candles.slice(-10).reduce((s, c) => s + Math.abs(c.close - c.open), 0) / Math.min(10, candles.length);
  if (body > avgBody * 2) {
    results.push({ type: last.close > last.open ? "bullish" : "bearish" });
  }
  return results;
}

function findTurtleSoup(candles: Candle[]) {
  const results: { type: string }[] = [];
  if (candles.length < 20) return results;
  const recent = candles.slice(-20);
  const low20 = Math.min(...recent.map((c) => c.low));
  const high20 = Math.max(...recent.map((c) => c.high));
  const last = candles[candles.length - 1];
  if (last.low < low20 && last.close > low20) results.push({ type: "bullish" });
  if (last.high > high20 && last.close < high20) results.push({ type: "bearish" });
  return results;
}

function getPremiumDiscount(low: number, high: number, close: number) {
  const range = high - low;
  if (range === 0) return null;
  const pct = ((close - low) / range) * 100;
  const zone = pct < 40 ? "discount" : pct > 60 ? "premium" : "equilibrium";
  return { zone, pct };
}

// Score candles for one timeframe
function scoreCandles(candles: Candle[], weight: number, tfLabel: string) {
  if (!candles || candles.length < 10) return { bull: 0, bear: 0, confluences: [] as Confluence[] };

  const lb = candles.length > 50 ? 3 : 2;
  const { highs, lows } = findSwings(candles, lb);
  const structure = detectStructure(highs, lows);
  const lastHigh = highs.length ? highs[highs.length - 1].price : null;
  const lastLow = lows.length ? lows[lows.length - 1].price : null;
  const equil = lastHigh && lastLow ? (lastHigh + lastLow) / 2 : null;
  const bos = findBOS(candles, highs, lows);
  const choch = findCHoCH(candles, highs, lows);
  const mss = findMSS(candles);
  const displacement = findDisplacement(candles);
  const turtleSoup = findTurtleSoup(candles);
  const close = candles[candles.length - 1].close;
  const pdZone = lastHigh && lastLow ? getPremiumDiscount(lastLow, lastHigh, close) : null;

  let bull = 0;
  let bear = 0;
  const confluences: Confluence[] = [];
  const w = weight;

  const add = (dir: "bull" | "bear", pts: number, text: string) => {
    if (dir === "bull") bull += pts;
    else bear += pts;
    confluences.push({ dir, pts, text });
  };

  if (structure === "bullish") add("bull", 3 * w, `${tfLabel} Structure bullish`);
  else if (structure === "bearish") add("bear", 3 * w, `${tfLabel} Structure bearish`);

  if (bos.length) {
    const l = bos[bos.length - 1];
    l.type === "bullish"
      ? add("bull", 2 * w, `${tfLabel} BOS bullish`)
      : add("bear", 2 * w, `${tfLabel} BOS bearish`);
  }
  if (choch.length) {
    const l = choch[choch.length - 1];
    l.type === "bullish"
      ? add("bull", 3 * w, `${tfLabel} CHoCH bullish shift`)
      : add("bear", 3 * w, `${tfLabel} CHoCH bearish shift`);
  }
  if (mss.length) {
    const l = mss[mss.length - 1];
    l.type === "bullish"
      ? add("bull", 2 * w, `${tfLabel} MSS micro-bullish flip`)
      : add("bear", 2 * w, `${tfLabel} MSS micro-bearish flip`);
  }
  if (pdZone) {
    if (pdZone.zone === "discount")
      add("bull", 2 * w, `${tfLabel} Price in Discount zone (${pdZone.pct.toFixed(1)}%)`);
    else if (pdZone.zone === "premium")
      add("bear", 2 * w, `${tfLabel} Price in Premium zone (${pdZone.pct.toFixed(1)}%)`);
  }
  if (displacement.length) {
    const l = displacement[displacement.length - 1];
    l.type === "bullish"
      ? add("bull", 1 * w, `${tfLabel} Bullish Displacement candle`)
      : add("bear", 1 * w, `${tfLabel} Bearish Displacement candle`);
  }
  if (turtleSoup.length) {
    const l = turtleSoup[turtleSoup.length - 1];
    l.type === "bullish"
      ? add("bull", 2 * w, `${tfLabel} Turtle Soup bullish reversal`)
      : add("bear", 2 * w, `${tfLabel} Turtle Soup bearish reversal`);
  }

  return { bull, bear, confluences };
}

// ── Market session detection ─────────────────────────────────────
function getMarketSession(): MarketSession {
  const et = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const h = et.getHours();
  const m = et.getMinutes();
  const day = et.getDay();
  const isWeekend = day === 0 || day === 6;
  const etMins = h * 60 + m;

  const SESS_ASIA_START = 18 * 60;
  const SESS_ASIA_END = 2 * 60;
  const SESS_LONDON_START = 3 * 60;
  const SESS_LONDON_END = 8 * 60;
  const SESS_PREMARKET = 4 * 60;
  const SESS_NY_OPEN = 9 * 60 + 30;
  const SESS_NY_CLOSE = 16 * 60;

  const inNY = !isWeekend && etMins >= SESS_NY_OPEN && etMins < SESS_NY_CLOSE;
  const inOverlap = !isWeekend && etMins >= SESS_LONDON_END && etMins < SESS_NY_OPEN;
  const inLondon = !isWeekend && etMins >= SESS_LONDON_START && etMins < SESS_LONDON_END;
  const inPreMkt = !isWeekend && etMins >= SESS_PREMARKET && etMins < SESS_NY_OPEN;
  const inAsia = !isWeekend && (etMins >= SESS_ASIA_START || etMins < SESS_ASIA_END);

  if (inNY) return { label: "New York", badgeClass: "open" };
  if (inOverlap) return { label: "London/NY Overlap", badgeClass: "overlap" };
  if (inLondon) return { label: "London", badgeClass: "london" };
  if (inPreMkt) return { label: "Pre-Market", badgeClass: "premarket" };
  if (inAsia) return { label: "Asia", badgeClass: "asia" };
  return { label: isWeekend ? "Weekend" : "Market Closed", badgeClass: "closed" };
}

// ── Sub-components ───────────────────────────────────────────────
function ConfluenceTooltip({
  confluences,
  bull,
  bear,
}: {
  confluences: Confluence[];
  bull: number;
  bear: number;
}) {
  const items = confluences
    .filter((c) => c.pts > 0)
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 8);

  if (!items.length) return null;

  return (
    <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-[300] hidden group-hover:block bg-[#0f172a] border border-[#1e293b] rounded-[10px] px-3.5 py-3 w-[270px] shadow-[0_8px_24px_rgba(0,0,0,0.6)] text-left">
      <div className="text-[10px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">
        ICT / SMC Confluences
      </div>
      <div className="text-[10px] text-[#475569] mb-1.5">
        Bull <b className="text-green-500">{bull.toFixed(1)}</b>
        {" / "}
        Bear <b className="text-red-500">{bear.toFixed(1)}</b>
      </div>
      {items.map((c, i) => (
        <div key={i} className="flex items-start gap-1.5 py-0.5 text-[11.5px] text-slate-300">
          <span
            className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              c.dir === "bull" ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span>{c.text}</span>
        </div>
      ))}
    </div>
  );
}

function BiasCard({
  entry,
  isActive,
  onClick,
}: {
  entry: SnapshotEntry;
  isActive: boolean;
  onClick: () => void;
}) {
  const biasColor =
    entry.bias === "BULLISH"
      ? "text-green-500"
      : entry.bias === "BEARISH"
        ? "text-red-500"
        : "text-amber-500";

  const confBadge =
    entry.conf === "HIGH"
      ? "bg-green-500/15 text-green-500"
      : entry.conf === "MEDIUM"
        ? "bg-amber-500/15 text-amber-500"
        : "bg-red-500/15 text-red-500";

  const barColor = (() => {
    if (entry.bias === "BULLISH")
      return entry.conf === "HIGH" ? "#22c55e" : entry.conf === "MEDIUM" ? "#4ade80" : "#86efac";
    if (entry.bias === "BEARISH")
      return entry.conf === "HIGH" ? "#ef4444" : entry.conf === "MEDIUM" ? "#f87171" : "#fca5a5";
    return "#f59e0b";
  })();

  return (
    <div
      className={`group relative bg-[#0f172a] border rounded-xl px-4 pt-5 pb-4 cursor-pointer flex flex-col items-center text-center gap-[5px] transition-all duration-200 hover:border-[#334155] hover:bg-[#131f35] ${
        isActive ? "border-current" : "border-[#1e293b]"
      }`}
      style={{
        borderColor: isActive ? entry.color : undefined,
        background: isActive ? `color-mix(in srgb, ${entry.color} 6%, #0f172a)` : undefined,
      }}
      onClick={onClick}
    >
      {/* Category dot + label */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-[7px] h-[7px] rounded-full flex-shrink-0"
          style={{ background: entry.color }}
        />
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
          {entry.name}
        </span>
      </div>

      {/* Instrument sub-label */}
      <div className="text-[10px] text-[#334155] mb-0.5">{entry.sub}</div>

      {/* Bias direction */}
      <div className={`text-[26px] font-black tracking-tight leading-none my-1 ${biasColor}`}>
        {entry.bias}
      </div>

      {/* Confidence badge */}
      <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold ${confBadge}`}>
        {entry.conf} CONFIDENCE
      </span>

      {/* Confidence bar */}
      <div className="w-full h-[3px] bg-[#1e293b] rounded-sm overflow-hidden mt-1.5">
        <div
          className="h-full rounded-sm transition-[width] duration-500"
          style={{ width: CONF_PCT[entry.conf], background: barColor }}
        />
      </div>

      {/* Tooltip on hover */}
      <ConfluenceTooltip confluences={entry.confluences} bull={entry.bull} bear={entry.bear} />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 justify-center">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 pt-5 pb-4 flex flex-col items-center gap-2 animate-pulse"
        >
          <div className="h-2.5 w-16 bg-[#1e293b] rounded" />
          <div className="h-2 w-12 bg-[#1e293b] rounded" />
          <div className="h-7 w-24 bg-[#1e293b] rounded mt-1" />
          <div className="h-4 w-28 bg-[#1e293b] rounded" />
          <div className="h-[3px] w-full bg-[#1e293b] rounded mt-1" />
        </div>
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function MarketsSnapshot() {
  const { mode, setMode } = useTradingMode();
  const [data, setData] = useState<SnapshotEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  // Start with a stable placeholder so SSR and first client render agree —
  // prevents React #418 hydration mismatch when the server and client tick
  // across a session boundary. The real session is computed in useEffect.
  const [session, setSession] = useState<MarketSession>({
    label: "",
    badgeClass: "closed",
  });
  const cacheTs = useRef(0);

  const loadSnapshot = useCallback(async () => {
    // Use cache if fresh
    if (data && Date.now() - cacheTs.current < SNAPSHOT_TTL) return;

    setLoading(true);
    setError(false);

    try {
      const dailyResults = await Promise.allSettled(
        SNAPSHOT_INSTRUMENTS.map((inst) => fetchCandles(inst.symbol, "1d"))
      );
      const h1Results = await Promise.allSettled(
        SNAPSHOT_INSTRUMENTS.map((inst) => fetchCandles(inst.symbol, "1h"))
      );

      const entries: SnapshotEntry[] = SNAPSHOT_INSTRUMENTS.map((inst, i) => {
        const dailyC = dailyResults[i].status === "fulfilled" ? dailyResults[i].value : [];
        const h1C = h1Results[i].status === "fulfilled" ? h1Results[i].value : [];

        const d = scoreCandles(dailyC, 1.0, "Daily");
        const h1 = scoreCandles(h1C, 1.3, "1H");
        const bull = d.bull + h1.bull;
        const bear = d.bear + h1.bear;
        const confluences = [...d.confluences, ...h1.confluences];

        const total = bull + bear;
        const net = bull - bear;
        const margin = total > 0 ? Math.abs(net) / total : 0;
        const bias: SnapshotEntry["bias"] = net > 0 ? "BULLISH" : net < 0 ? "BEARISH" : "NEUTRAL";
        const conf: SnapshotEntry["conf"] = margin >= 0.55 ? "HIGH" : margin >= 0.35 ? "MEDIUM" : "LOW";

        return { ...inst, bias, conf, bull, bear, confluences };
      });

      setData(entries);
      setUpdatedAt(new Date());
      cacheTs.current = Date.now();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [data]);

  // Initial load + poll every 5 minutes
  useEffect(() => {
    loadSnapshot();
    const interval = setInterval(() => {
      cacheTs.current = 0; // bust cache
      loadSnapshot();
    }, SNAPSHOT_TTL);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update session badge every 60s (and set the real value on first mount
  // — see the stable placeholder in the useState initializer above).
  useEffect(() => {
    setSession(getMarketSession());
    const interval = setInterval(() => setSession(getMarketSession()), 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
          {session.label ? `${session.label} Bias` : "Bias"} &#8212; ICT / SMC
        </span>
        <div className="flex items-center gap-2.5">
          {updatedAt && (
            <span className="text-[10px] text-[#334155]">
              Updated{" "}
              {updatedAt.getHours().toString().padStart(2, "0")}:
              {updatedAt.getMinutes().toString().padStart(2, "0")}
            </span>
          )}
          {session.label && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${BADGE_STYLES[session.badgeClass]}`}
            >
              {session.label.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading && !data ? (
        <LoadingSkeleton />
      ) : error && !data ? (
        <div className="text-[#334155] text-[11px] text-center py-10">Snapshot unavailable</div>
      ) : data ? (
        <div className="grid gap-3 justify-center grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((entry) => (
            <BiasCard
              key={entry.cat}
              entry={entry}
              isActive={entry.cat === mode}
              onClick={() => setMode(entry.cat)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
