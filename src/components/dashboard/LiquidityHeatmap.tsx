"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LiquidityPool {
  tag: string;
  price: number;
  side: "bsl" | "ssl";
  distance: number;
  distancePct: number;
  formedMs: number;
  hoursSince: number;
  reasons: string[];
  heat: number;
}

interface ApiResponse {
  liquidityPools: LiquidityPool[];
  currentPrice: number;
  symbol: string;
}

interface InstrumentOption {
  key: string;
  label: string;
  symbol: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const INSTRUMENTS: InstrumentOption[] = [
  { key: "NAS100",  label: "NAS100",   symbol: "NQ%3DF" },
  { key: "SPX",     label: "S&P 500",  symbol: "ES%3DF" },
  { key: "EURUSD",  label: "EUR/USD",  symbol: "EURUSD%3DX" },
  { key: "GBPUSD",  label: "GBP/USD",  symbol: "GBPUSD%3DX" },
  { key: "BTC",     label: "BTC/USD",  symbol: "BTC-USD" },
  { key: "GOLD",    label: "Gold",     symbol: "GC%3DF" },
];

const REFRESH_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtPrice(p: number): string {
  return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDist(d: number): string {
  const sign = d > 0 ? "+" : "";
  return sign + d.toFixed(2);
}

type HeatTier = "hot" | "warm" | "magnet" | "distant";

function getHeatTier(heat: number): HeatTier {
  if (heat >= 70) return "hot";
  if (heat >= 40) return "warm";
  if (heat >= 20) return "magnet";
  return "distant";
}

const DOT_STYLES: Record<HeatTier, string> = {
  hot:     "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]",
  warm:    "bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.4)]",
  magnet:  "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]",
  distant: "bg-slate-600",
};

const PILL_STYLES: Record<HeatTier, string> = {
  hot:     "bg-red-500/20 text-red-400",
  warm:    "bg-amber-500/20 text-amber-400",
  magnet:  "bg-green-500/20 text-green-400",
  distant: "bg-slate-700 text-slate-500",
};

const LEGEND: { tier: HeatTier; label: string }[] = [
  { tier: "hot",     label: "High-prob sweep (70+)" },
  { tier: "warm",    label: "Warm (40-69)" },
  { tier: "magnet",  label: "Magnet (20-39)" },
  { tier: "distant", label: "Distant (0-19)" },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function Dot({ tier }: { tier: HeatTier }) {
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${DOT_STYLES[tier]}`} />
  );
}

function HeatPill({ heat }: { heat: number }) {
  const tier = getHeatTier(heat);
  return (
    <span className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full ${PILL_STYLES[tier]}`}>
      {Math.round(heat)}
    </span>
  );
}

function Tooltip({ reasons, visible }: { reasons: string[]; visible: boolean }) {
  if (!visible || reasons.length === 0) return null;
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 min-w-[200px] max-w-[280px] shadow-xl pointer-events-none">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Why this level matters</div>
      <ul className="list-none p-0 m-0 space-y-0.5">
        {reasons.map((r, i) => (
          <li key={i} className="text-[11px] text-slate-300 leading-snug">
            <span className="text-slate-500 mr-1">&bull;</span>{r}
          </li>
        ))}
      </ul>
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#334155]" />
    </div>
  );
}

function PoolRowItem({ pool, side }: { pool: LiquidityPool; side: "above" | "below" }) {
  const [hovered, setHovered] = useState(false);
  const tier = getHeatTier(pool.heat);

  return (
    <div
      className="relative grid grid-cols-[14px_1fr_auto_auto_auto] items-center gap-2.5 px-2 py-2.5 border-b border-[#1a2235] last:border-b-0 hover:bg-blue-500/[0.04] text-[13px] cursor-default"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Dot tier={tier} />
      <span className="text-slate-200 font-medium truncate">
        {pool.tag}
      </span>
      <span className="text-slate-200 font-bold tabular-nums">
        {fmtPrice(pool.price)}
      </span>
      <span
        className={`text-xs tabular-nums min-w-[64px] text-right ${
          side === "above" ? "text-red-400" : "text-green-400"
        }`}
      >
        {fmtDist(pool.distance)}
      </span>
      <HeatPill heat={pool.heat} />
      <Tooltip reasons={pool.reasons} visible={hovered} />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-9 bg-slate-800/50 rounded" />
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="text-slate-500 text-sm">Unable to load data</div>
      <button
        onClick={onRetry}
        className="bg-[#1e293b] text-slate-200 border border-[#334155] px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer hover:bg-[#334155] transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function LiquidityHeatmap() {
  const [selected, setSelected] = useState("NAS100");
  const [menuOpen, setMenuOpen] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const instrument = INSTRUMENTS.find((i) => i.key === selected)!;

  // Fetch data
  const fetchData = useCallback(async (showLoading = true) => {
    const inst = INSTRUMENTS.find((i) => i.key === selected);
    if (!inst) return;

    if (showLoading) setLoading(true);
    setError(false);

    try {
      const res = await fetch(`/api/analysis?symbol=${inst.symbol}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiResponse = await res.json();
      setData(json);
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  // Initial fetch + re-fetch on instrument change
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchData(false); // silent refresh, no loading spinner
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Split and sort pools
  const { buyside, sellside } = (() => {
    if (!data?.liquidityPools) return { buyside: [], sellside: [] };

    const buyside = data.liquidityPools
      .filter((p) => p.side === "bsl")
      .sort((a, b) => Math.abs(a.distance) - Math.abs(b.distance));

    const sellside = data.liquidityPools
      .filter((p) => p.side === "ssl")
      .sort((a, b) => Math.abs(a.distance) - Math.abs(b.distance));

    return { buyside, sellside };
  })();

  return (
    <section className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap mb-4 pb-3.5 border-b border-[#1e293b]">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-slate-200 m-0">
          Liquidity Pool Heatmap
        </h3>

        {/* Instrument dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            ref={btnRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
            className="bg-[#1e293b] text-slate-200 border border-[#334155] px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer flex items-center gap-1.5 hover:bg-[#334155] transition-colors"
          >
            <span>{instrument.label}</span>
            <span className="text-slate-500 text-[10px]">&#9662;</span>
          </button>

          {menuOpen && (
            <div className="absolute top-[calc(100%+4px)] left-0 bg-[#1e293b] border border-[#334155] rounded-md min-w-[160px] z-50 overflow-hidden">
              {INSTRUMENTS.map((opt) => (
                <div
                  key={opt.key}
                  onClick={() => {
                    setSelected(opt.key);
                    setMenuOpen(false);
                  }}
                  className={`px-3 py-2 text-xs cursor-pointer transition-colors ${
                    opt.key === selected
                      ? "text-blue-400 bg-blue-500/10"
                      : "text-slate-200 hover:bg-[#334155]"
                  }`}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {data && !loading && (
          <div className="text-xs text-slate-400 tabular-nums">
            Current
            <strong className="text-slate-200 text-sm font-bold ml-1.5">
              {fmtPrice(data.currentPrice)}
            </strong>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-red-500 mb-2.5">
              Above Price &mdash; Buy-side Liquidity
            </div>
            <LoadingSkeleton />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-green-500 mb-2.5">
              Below Price &mdash; Sell-side Liquidity
            </div>
            <LoadingSkeleton />
          </div>
        </div>
      ) : error ? (
        <ErrorState onRetry={() => fetchData(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Buyside */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-red-500 mb-2.5">
              Above Price &mdash; Buy-side Liquidity
            </div>
            {buyside.length === 0 ? (
              <div className="text-slate-600 text-xs py-4 text-center">No pools detected</div>
            ) : (
              buyside.map((pool, i) => (
                <PoolRowItem key={`${pool.tag}-${pool.price}-${i}`} pool={pool} side="above" />
              ))
            )}
          </div>

          {/* Sellside */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-green-500 mb-2.5">
              Below Price &mdash; Sell-side Liquidity
            </div>
            {sellside.length === 0 ? (
              <div className="text-slate-600 text-xs py-4 text-center">No pools detected</div>
            ) : (
              sellside.map((pool, i) => (
                <PoolRowItem key={`${pool.tag}-${pool.price}-${i}`} pool={pool} side="below" />
              ))
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 flex-wrap mt-3.5 pt-3 border-t border-[#1e293b] text-[11px] text-slate-500">
        {LEGEND.map(({ tier, label }) => (
          <span key={tier} className="flex items-center gap-1.5">
            <Dot tier={tier} />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
