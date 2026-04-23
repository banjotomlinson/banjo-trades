"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type AssetClass = "futures" | "commodities" | "crypto" | "forex";
type ActiveTab = "all" | AssetClass;

interface Instrument {
  symbol: string;
  name: string;
  sub: string;
  decimals: number;
  assetClass: AssetClass;
}

const ASSET_CLASSES: { key: ActiveTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "futures", label: "Futures" },
  { key: "commodities", label: "Commodities" },
  { key: "crypto", label: "Crypto" },
  { key: "forex", label: "Forex" },
];

const INSTRUMENTS: Record<AssetClass, Instrument[]> = {
  futures: [
    { symbol: "NQ=F", name: "NASDAQ 100", sub: "NQ Futures", decimals: 2, assetClass: "futures" },
    { symbol: "ES=F", name: "S&P 500", sub: "ES Futures", decimals: 2, assetClass: "futures" },
    { symbol: "YM=F", name: "Dow Jones", sub: "YM Futures", decimals: 2, assetClass: "futures" },
    { symbol: "RTY=F", name: "Russell 2000", sub: "RTY Futures", decimals: 2, assetClass: "futures" },
  ],
  commodities: [
    { symbol: "GC=F", name: "Gold", sub: "GC Futures", decimals: 2, assetClass: "commodities" },
    { symbol: "SI=F", name: "Silver", sub: "SI Futures", decimals: 3, assetClass: "commodities" },
    { symbol: "CL=F", name: "Crude Oil", sub: "CL Futures", decimals: 2, assetClass: "commodities" },
    { symbol: "NG=F", name: "Natural Gas", sub: "NG Futures", decimals: 3, assetClass: "commodities" },
    { symbol: "HG=F", name: "Copper", sub: "HG Futures", decimals: 4, assetClass: "commodities" },
    { symbol: "PL=F", name: "Platinum", sub: "PL Futures", decimals: 2, assetClass: "commodities" },
  ],
  crypto: [
    { symbol: "BTC-USD", name: "Bitcoin", sub: "BTC/USD", decimals: 2, assetClass: "crypto" },
    { symbol: "ETH-USD", name: "Ethereum", sub: "ETH/USD", decimals: 2, assetClass: "crypto" },
    { symbol: "SOL-USD", name: "Solana", sub: "SOL/USD", decimals: 2, assetClass: "crypto" },
    { symbol: "BNB-USD", name: "BNB", sub: "BNB/USD", decimals: 2, assetClass: "crypto" },
    { symbol: "XRP-USD", name: "XRP", sub: "XRP/USD", decimals: 4, assetClass: "crypto" },
    { symbol: "ADA-USD", name: "Cardano", sub: "ADA/USD", decimals: 4, assetClass: "crypto" },
    { symbol: "DOGE-USD", name: "Dogecoin", sub: "DOGE/USD", decimals: 4, assetClass: "crypto" },
    { symbol: "DOT-USD", name: "Polkadot", sub: "DOT/USD", decimals: 3, assetClass: "crypto" },
  ],
  forex: [
    { symbol: "EURUSD=X", name: "EUR/USD", sub: "Euro / US Dollar", decimals: 5, assetClass: "forex" },
    { symbol: "GBPUSD=X", name: "GBP/USD", sub: "Pound / US Dollar", decimals: 5, assetClass: "forex" },
    { symbol: "USDJPY=X", name: "USD/JPY", sub: "US Dollar / Yen", decimals: 3, assetClass: "forex" },
    { symbol: "AUDUSD=X", name: "AUD/USD", sub: "Aussie / US Dollar", decimals: 5, assetClass: "forex" },
    { symbol: "USDCAD=X", name: "USD/CAD", sub: "US Dollar / Loonie", decimals: 5, assetClass: "forex" },
    { symbol: "NZDUSD=X", name: "NZD/USD", sub: "Kiwi / US Dollar", decimals: 5, assetClass: "forex" },
    { symbol: "USDCHF=X", name: "USD/CHF", sub: "US Dollar / Franc", decimals: 5, assetClass: "forex" },
  ],
};

const ALL_CLASSES: AssetClass[] = ["futures", "commodities", "crypto", "forex"];
const MAX_DAYS_BACK = 364;

const CLASS_BADGE: Record<AssetClass, { label: string; className: string }> = {
  futures: { label: "FUT", className: "bg-amber-500/15 text-amber-400" },
  commodities: { label: "COMM", className: "bg-green-500/15 text-green-400" },
  crypto: { label: "CRYPTO", className: "bg-violet-500/15 text-violet-400" },
  forex: { label: "FX", className: "bg-cyan-500/15 text-cyan-400" },
};

const POLL_MS = 5 * 60 * 1000;

interface Series {
  // Unix seconds per daily bar, ascending.
  timestamps: number[];
  closes: (number | null)[];
}

type ClassSeries = Record<string, Series>;

interface Move {
  symbol: string;
  name: string;
  sub: string;
  decimals: number;
  assetClass: AssetClass;
  price: number;
  changePct: number;
  changeAbs: number;
}

async function fetchSeries(inst: Instrument): Promise<Series | null> {
  const url = `/api/yahoo?symbol=${encodeURIComponent(inst.symbol)}&interval=1d&range=1y`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const result = json.chart?.result?.[0];
    const timestamps: number[] = result?.timestamp ?? [];
    const closes: (number | null)[] =
      result?.indicators?.quote?.[0]?.close ?? [];
    if (timestamps.length === 0 || closes.length === 0) return null;
    return { timestamps, closes };
  } catch {
    return null;
  }
}

// Given a series and a target end-of-day timestamp (ms), return the move:
// the latest close at/before target, and the close of the bar before that.
function moveFromSeries(
  series: Series,
  inst: Instrument,
  targetMs: number
): Move | null {
  const targetSec = Math.floor(targetMs / 1000);
  // Find the latest bar whose timestamp is <= targetSec.
  let idx = -1;
  for (let i = series.timestamps.length - 1; i >= 0; i--) {
    if (series.timestamps[i] <= targetSec) {
      idx = i;
      break;
    }
  }
  if (idx === -1) return null;

  // Walk back from idx to collect the last two non-null closes.
  let last: number | null = null;
  let prev: number | null = null;
  for (let i = idx; i >= 0; i--) {
    const v = series.closes[i];
    if (v == null) continue;
    if (last == null) last = v;
    else {
      prev = v;
      break;
    }
  }
  if (last == null || prev == null || prev === 0) return null;
  return {
    symbol: inst.symbol,
    name: inst.name,
    sub: inst.sub,
    decimals: inst.decimals,
    assetClass: inst.assetClass,
    price: last,
    changePct: ((last - prev) / prev) * 100,
    changeAbs: last - prev,
  };
}

function fmt(n: number, d: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

export default function MoversPanel() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [dateOffset, setDateOffset] = useState(0); // days back from today
  const [seriesByClass, setSeriesByClass] = useState<
    Record<AssetClass, ClassSeries>
  >({
    futures: {},
    commodities: {},
    crypto: {},
    forex: {},
  });
  const [loadingByClass, setLoadingByClass] = useState<
    Record<AssetClass, boolean>
  >({
    futures: true,
    commodities: true,
    crypto: true,
    forex: true,
  });

  const loadClass = useCallback(async (cls: AssetClass) => {
    setLoadingByClass((s) => ({ ...s, [cls]: true }));
    const insts = INSTRUMENTS[cls];
    const results = await Promise.all(insts.map(fetchSeries));
    const next: ClassSeries = {};
    results.forEach((r, i) => {
      if (r) next[insts[i].symbol] = r;
    });
    setSeriesByClass((s) => ({ ...s, [cls]: next }));
    setLoadingByClass((s) => ({ ...s, [cls]: false }));
  }, []);

  // Fetch series for the active tab's classes on mount/tab change, + poll.
  useEffect(() => {
    const classes: AssetClass[] =
      activeTab === "all" ? ALL_CLASSES : [activeTab];
    classes.forEach(loadClass);
    const id = setInterval(() => classes.forEach(loadClass), POLL_MS);
    return () => clearInterval(id);
  }, [activeTab, loadClass]);

  // Target date = today - dateOffset, end of that day (local).
  const { targetMs, dateLabel } = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - dateOffset);
    const label =
      dateOffset === 0
        ? "Today"
        : d.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year:
              d.getFullYear() !== new Date().getFullYear()
                ? "numeric"
                : undefined,
          });
    d.setHours(23, 59, 59, 999);
    return { targetMs: d.getTime(), dateLabel: label };
  }, [dateOffset]);

  // Compute moves for the active tab at the target date.
  const moves = useMemo<Move[]>(() => {
    const classes: AssetClass[] =
      activeTab === "all" ? ALL_CLASSES : [activeTab];
    const out: Move[] = [];
    for (const cls of classes) {
      for (const inst of INSTRUMENTS[cls]) {
        const s = seriesByClass[cls][inst.symbol];
        if (!s) continue;
        const m = moveFromSeries(s, inst, targetMs);
        if (m) out.push(m);
      }
    }
    return out;
  }, [activeTab, seriesByClass, targetMs]);

  const loading =
    activeTab === "all"
      ? ALL_CLASSES.every(
          (c) => loadingByClass[c] && Object.keys(seriesByClass[c]).length === 0
        )
      : loadingByClass[activeTab] &&
        Object.keys(seriesByClass[activeTab]).length === 0;

  const topMover = useMemo(() => {
    if (moves.length === 0) return null;
    return [...moves].sort(
      (a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)
    )[0];
  }, [moves]);

  const sortedMoves = useMemo(
    () =>
      [...moves].sort(
        (a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)
      ),
    [moves]
  );

  const topPositive = topMover ? topMover.changePct >= 0 : true;
  const topColor = topPositive ? "text-green-500" : "text-red-500";
  const topBg = topPositive
    ? "from-green-500/10 to-transparent"
    : "from-red-500/10 to-transparent";
  const arrow = topPositive ? "▲" : "▼";

  const shiftDay = (delta: number) =>
    setDateOffset((d) => Math.min(MAX_DAYS_BACK, Math.max(0, d + delta)));

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden">
      {/* Header + class tabs */}
      <div className="px-5 py-4 border-b border-[#1e293b] flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-semibold text-[#f1f5f9]">
          Market Movers
        </h2>
        <div className="flex gap-1 bg-[#0f172a] rounded-lg p-1 border border-[#1e293b] flex-wrap">
          {ASSET_CLASSES.map((ac) => (
            <button
              key={ac.key}
              onClick={() => setActiveTab(ac.key)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === ac.key
                  ? "bg-accent text-white"
                  : "text-[#64748b] hover:text-[#f1f5f9]"
              }`}
            >
              {ac.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-2 flex-wrap px-5 py-3 border-b border-[#1e293b] bg-[#0f172a]">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] mr-1">
          Date
        </span>
        <button
          onClick={() => shiftDay(1)}
          className="bg-[#111827] border border-[#1e293b] rounded-md px-2.5 py-1 text-xs text-[#e2e8f0] hover:border-[#64748b] transition-colors"
          title="Previous day"
          style={{
            opacity: dateOffset >= MAX_DAYS_BACK ? 0.3 : 1,
            pointerEvents: dateOffset >= MAX_DAYS_BACK ? "none" : "auto",
          }}
        >
          ←
        </button>
        <span className="text-[13px] font-semibold text-[#e2e8f0] min-w-[160px] text-center tabular-nums">
          {dateLabel}
        </span>
        <button
          onClick={() => shiftDay(-1)}
          className="bg-[#111827] border border-[#1e293b] rounded-md px-2.5 py-1 text-xs text-[#e2e8f0] hover:border-[#64748b] transition-colors"
          title="Next day"
          style={{
            opacity: dateOffset <= 0 ? 0.3 : 1,
            pointerEvents: dateOffset <= 0 ? "none" : "auto",
          }}
        >
          →
        </button>
        <button
          onClick={() => setDateOffset(0)}
          className="border border-accent text-accent px-3 py-1 rounded-md text-xs font-semibold hover:bg-accent hover:text-white transition-all ml-1"
          style={{ opacity: dateOffset === 0 ? 0.5 : 1 }}
        >
          Today
        </button>
        <span className="flex-1" />
        {/* Quick jumps */}
        {[7, 30, 90].map((n) => (
          <button
            key={n}
            onClick={() => setDateOffset(n)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
              dateOffset === n
                ? "bg-accent text-white border-transparent"
                : "border-[#1e293b] text-[#64748b] hover:text-[#e2e8f0] hover:border-[#64748b]"
            }`}
          >
            -{n}d
          </button>
        ))}
      </div>

      {/* Top Mover card */}
      <div
        className={`relative px-6 py-5 border-b border-[#1e293b] bg-gradient-to-r ${topBg}`}
      >
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] mb-2">
          {activeTab === "all"
            ? "Top Mover"
            : `${ASSET_CLASSES.find((a) => a.key === activeTab)?.label} Top Mover`}{" "}
          <span className="text-[#475569] ml-1">· {dateLabel}</span>
        </div>
        {loading && !topMover ? (
          <div className="text-[#64748b] text-sm">Loading...</div>
        ) : topMover ? (
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-2xl font-bold text-white">
                  {topMover.name}
                </div>
                {activeTab === "all" && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${CLASS_BADGE[topMover.assetClass].className}`}
                  >
                    {CLASS_BADGE[topMover.assetClass].label}
                  </span>
                )}
              </div>
              <div className="text-xs text-[#64748b] mt-0.5">{topMover.sub}</div>
            </div>
            <div className="text-right">
              <div className={`text-[32px] font-black tabular-nums leading-none ${topColor}`}>
                {arrow} {topPositive ? "+" : ""}
                {topMover.changePct.toFixed(2)}%
              </div>
              <div className="text-sm text-[#94a3b8] tabular-nums mt-1">
                {fmt(topMover.price, topMover.decimals)}{" "}
                <span className={`${topColor} text-xs ml-1`}>
                  ({topPositive ? "+" : ""}
                  {fmt(topMover.changeAbs, topMover.decimals)})
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[#64748b] text-sm">No data for this date</div>
        )}
      </div>

      {/* Full list */}
      <div>
        <div className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#64748b] border-b border-[#1e293b] flex items-center">
          <span className="flex-1">Instrument</span>
          <span className="w-28 text-right">Price</span>
          <span className="w-28 text-right">Change</span>
          <span className="w-24 text-right">% Move</span>
        </div>
        {loading && sortedMoves.length === 0 ? (
          <div className="p-8 text-center text-[#64748b] text-sm">Loading...</div>
        ) : sortedMoves.length === 0 ? (
          <div className="p-8 text-center text-[#64748b] text-sm">
            No data for this date
          </div>
        ) : (
          sortedMoves.map((m) => {
            const positive = m.changePct >= 0;
            const color = positive ? "text-green-500" : "text-red-500";
            return (
              <div
                key={m.symbol}
                className="px-5 py-3 border-b border-[#1e293b]/60 last:border-b-0 flex items-center hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-white truncate">
                      {m.name}
                    </div>
                    {activeTab === "all" && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${CLASS_BADGE[m.assetClass].className}`}
                      >
                        {CLASS_BADGE[m.assetClass].label}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#64748b] truncate">
                    {m.sub}
                  </div>
                </div>
                <div className="w-28 text-right tabular-nums text-sm text-[#e2e8f0]">
                  {fmt(m.price, m.decimals)}
                </div>
                <div className={`w-28 text-right tabular-nums text-xs ${color}`}>
                  {positive ? "+" : ""}
                  {fmt(m.changeAbs, m.decimals)}
                </div>
                <div className={`w-24 text-right tabular-nums text-sm font-bold ${color}`}>
                  {positive ? "+" : ""}
                  {m.changePct.toFixed(2)}%
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
