"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Types ────────────────────────────────────────────────────────
interface Instrument {
  symbol: string;
  name: string;
  group: string;
}

const INSTRUMENTS: Instrument[] = [
  // Index futures
  { symbol: "NQ=F", name: "NASDAQ 100 (NQ)", group: "Index Futures" },
  { symbol: "ES=F", name: "S&P 500 (ES)", group: "Index Futures" },
  { symbol: "YM=F", name: "Dow Jones (YM)", group: "Index Futures" },
  { symbol: "RTY=F", name: "Russell 2000 (RTY)", group: "Index Futures" },
  // Commodities
  { symbol: "GC=F", name: "Gold (GC)", group: "Commodities" },
  { symbol: "SI=F", name: "Silver (SI)", group: "Commodities" },
  { symbol: "CL=F", name: "Crude Oil (CL)", group: "Commodities" },
  { symbol: "NG=F", name: "Natural Gas (NG)", group: "Commodities" },
  { symbol: "HG=F", name: "Copper (HG)", group: "Commodities" },
  { symbol: "PL=F", name: "Platinum (PL)", group: "Commodities" },
  // Agriculture
  { symbol: "ZC=F", name: "Corn (ZC)", group: "Agriculture" },
  { symbol: "ZW=F", name: "Wheat (ZW)", group: "Agriculture" },
  { symbol: "ZS=F", name: "Soybeans (ZS)", group: "Agriculture" },
  { symbol: "KC=F", name: "Coffee (KC)", group: "Agriculture" },
  { symbol: "SB=F", name: "Sugar (SB)", group: "Agriculture" },
  { symbol: "LE=F", name: "Live Cattle (LE)", group: "Agriculture" },
  // Forex
  { symbol: "EURUSD=X", name: "EUR/USD", group: "Forex" },
  { symbol: "GBPUSD=X", name: "GBP/USD", group: "Forex" },
  { symbol: "USDJPY=X", name: "USD/JPY", group: "Forex" },
  { symbol: "AUDUSD=X", name: "AUD/USD", group: "Forex" },
  { symbol: "USDCAD=X", name: "USD/CAD", group: "Forex" },
  // Crypto
  { symbol: "BTC-USD", name: "Bitcoin", group: "Crypto" },
  { symbol: "ETH-USD", name: "Ethereum", group: "Crypto" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DailyBar {
  ts: number; // unix seconds
  close: number;
}

interface SeasonalSeries {
  // one entry per day-of-month (1..31). null when no data for that DOM.
  values: (number | null)[];
}

interface SeasonalResult {
  avg15: SeasonalSeries;
  avg10: SeasonalSeries;
  avg5: SeasonalSeries;
  ytd: SeasonalSeries;       // current year, normalized
  envelopeMin: SeasonalSeries;
  envelopeMax: SeasonalSeries;
  yearsAvailable: number;
  // summary stats (% return month-end vs month-start)
  monthlyReturns: { year: number; ret: number }[];
}

// ── Yahoo fetch via our cache ────────────────────────────────────
async function fetchSeries(symbol: string): Promise<DailyBar[]> {
  // Use range=10y to keep payload reasonable. Yahoo also supports max but
  // can be slower and many futures contracts only have ~15y of clean data.
  const url = `/api/yahoo?symbol=${encodeURIComponent(symbol)}&interval=1d&range=10y`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const ts: number[] = result?.timestamp ?? [];
  const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
  const bars: DailyBar[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = closes[i];
    if (c == null) continue;
    bars.push({ ts: ts[i], close: c });
  }
  return bars;
}

// ── Seasonality math ─────────────────────────────────────────────
// Group bars by year for the selected month, then index each day-of-month.
// Normalize each year's series to % change vs that year's first available
// close in the month, so different years are directly comparable.
function buildSeasonality(bars: DailyBar[], month: number): SeasonalResult {
  const byYear = new Map<number, Map<number, number>>(); // year -> dom -> close
  for (const b of bars) {
    const d = new Date(b.ts * 1000);
    if (d.getMonth() !== month) continue;
    const y = d.getFullYear();
    const dom = d.getDate();
    if (!byYear.has(y)) byYear.set(y, new Map());
    byYear.get(y)!.set(dom, b.close);
  }

  // Build normalized per-year series: pct change from first close in month.
  const yearKeys = Array.from(byYear.keys()).sort((a, b) => a - b);
  const normalized = new Map<number, (number | null)[]>();
  const monthlyReturns: { year: number; ret: number }[] = [];
  for (const y of yearKeys) {
    const dayMap = byYear.get(y)!;
    const doms = Array.from(dayMap.keys()).sort((a, b) => a - b);
    if (doms.length < 2) continue;
    const first = dayMap.get(doms[0])!;
    const last = dayMap.get(doms[doms.length - 1])!;
    monthlyReturns.push({ year: y, ret: ((last - first) / first) * 100 });
    const arr: (number | null)[] = new Array(31).fill(null);
    let lastVal = 0;
    for (let dom = 1; dom <= 31; dom++) {
      const v = dayMap.get(dom);
      if (v != null) {
        const pct = ((v - first) / first) * 100;
        arr[dom - 1] = pct;
        lastVal = pct;
      } else if (arr[0] != null || lastVal !== 0) {
        // forward-fill weekends/holidays so the chart line stays continuous
        arr[dom - 1] = lastVal;
      }
    }
    // Trim leading nulls (DOM 1 might be a Saturday)
    let firstIdx = 0;
    while (firstIdx < 31 && arr[firstIdx] == null) firstIdx++;
    if (firstIdx > 0 && firstIdx < 31) {
      const seed = arr[firstIdx]!;
      for (let i = 0; i < firstIdx; i++) arr[i] = seed;
    }
    normalized.set(y, arr);
  }

  const thisYear = new Date().getFullYear();
  const histYears = yearKeys.filter((y) => y < thisYear);
  const last15 = histYears.slice(-15);
  const last10 = histYears.slice(-10);
  const last5 = histYears.slice(-5);

  const averageOf = (years: number[]): SeasonalSeries => {
    const out: (number | null)[] = new Array(31).fill(null);
    for (let dom = 0; dom < 31; dom++) {
      let sum = 0;
      let count = 0;
      for (const y of years) {
        const arr = normalized.get(y);
        if (!arr) continue;
        const v = arr[dom];
        if (v == null) continue;
        sum += v;
        count++;
      }
      out[dom] = count > 0 ? sum / count : null;
    }
    return { values: out };
  };

  const envelope = (years: number[]) => {
    const min: (number | null)[] = new Array(31).fill(null);
    const max: (number | null)[] = new Array(31).fill(null);
    for (let dom = 0; dom < 31; dom++) {
      let lo = Infinity, hi = -Infinity, n = 0;
      for (const y of years) {
        const arr = normalized.get(y);
        if (!arr) continue;
        const v = arr[dom];
        if (v == null) continue;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
        n++;
      }
      min[dom] = n > 0 ? lo : null;
      max[dom] = n > 0 ? hi : null;
    }
    return { min: { values: min }, max: { values: max } };
  };

  const env = envelope(last15.length > 0 ? last15 : histYears);
  const ytdArr = normalized.get(thisYear) ?? new Array(31).fill(null);

  return {
    avg15: averageOf(last15),
    avg10: averageOf(last10),
    avg5: averageOf(last5),
    ytd: { values: ytdArr },
    envelopeMin: env.min,
    envelopeMax: env.max,
    yearsAvailable: histYears.length,
    monthlyReturns,
  };
}

// ── Chart (SVG) ──────────────────────────────────────────────────
function SeasonalChart({ result, month }: { result: SeasonalResult; month: number }) {
  const W = 760, H = 320;
  const PAD_L = 44, PAD_R = 16, PAD_T = 16, PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverDom, setHoverDom] = useState<number | null>(null);

  const allValues: number[] = [];
  for (const s of [result.avg15, result.avg10, result.avg5, result.ytd, result.envelopeMin, result.envelopeMax]) {
    for (const v of s.values) if (v != null) allValues.push(v);
  }
  if (allValues.length === 0) return <div className="text-[#64748b] text-sm p-8 text-center">Not enough data</div>;
  const yMin = Math.min(...allValues);
  const yMax = Math.max(...allValues);
  const yPad = (yMax - yMin) * 0.1 || 0.5;
  const lo = yMin - yPad;
  const hi = yMax + yPad;

  const xAt = (dom: number) => PAD_L + (dom / 30) * innerW;
  const yAt = (v: number) => PAD_T + innerH - ((v - lo) / (hi - lo)) * innerH;

  function path(values: (number | null)[]): string {
    let d = "";
    for (let i = 0; i < 31; i++) {
      const v = values[i];
      if (v == null) continue;
      const cmd = d === "" ? "M" : "L";
      d += `${cmd}${xAt(i + 1).toFixed(2)},${yAt(v).toFixed(2)} `;
    }
    return d;
  }

  // Envelope band (min..max) as a filled area
  function envelopePath(min: (number | null)[], max: (number | null)[]): string {
    let top = "";
    let bottom = "";
    const idxs: number[] = [];
    for (let i = 0; i < 31; i++) {
      if (min[i] != null && max[i] != null) idxs.push(i);
    }
    if (idxs.length === 0) return "";
    for (const i of idxs) {
      top += `${top === "" ? "M" : "L"}${xAt(i + 1).toFixed(2)},${yAt(max[i]!).toFixed(2)} `;
    }
    for (let k = idxs.length - 1; k >= 0; k--) {
      const i = idxs[k];
      bottom += `L${xAt(i + 1).toFixed(2)},${yAt(min[i]!).toFixed(2)} `;
    }
    return top + bottom + "Z";
  }

  // Y gridlines at sensible % steps
  const range = hi - lo;
  const step = niceStep(range / 5);
  const gridYs: number[] = [];
  const start = Math.ceil(lo / step) * step;
  for (let v = start; v <= hi; v += step) gridYs.push(v);

  // ── Hover handlers ──
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const svgX = (px / rect.width) * W;
    if (svgX < PAD_L || svgX > W - PAD_R) {
      setHoverDom(null);
      return;
    }
    const ratio = (svgX - PAD_L) / innerW;
    const dom = Math.round(ratio * 30);
    setHoverDom(Math.max(1, Math.min(31, dom)));
  }

  // Tooltip series at hovered day-of-month
  const tooltipSeries = hoverDom != null
    ? [
        { label: "5y avg", color: "#22c55e", value: result.avg5.values[hoverDom - 1] },
        { label: "10y avg", color: "#60a5fa", value: result.avg10.values[hoverDom - 1] },
        { label: "15y avg", color: "#a78bfa", value: result.avg15.values[hoverDom - 1] },
        { label: "YTD", color: "#f97316", value: result.ytd.values[hoverDom - 1] },
      ]
    : [];
  const rangeMin = hoverDom != null ? result.envelopeMin.values[hoverDom - 1] : null;
  const rangeMax = hoverDom != null ? result.envelopeMax.values[hoverDom - 1] : null;

  // Flip tooltip to the left of the line when hovering past 60% width
  const hoverX = hoverDom != null ? xAt(hoverDom) : 0;
  const flip = hoverX > W * 0.6;
  const tooltipPct = (hoverX / W) * 100;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverDom(null)}
      className="relative cursor-crosshair select-none"
    >
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" className="block">
        {/* Background */}
        <rect x={0} y={0} width={W} height={H} fill="#0f172a" rx={8} />
        {/* Grid */}
        {gridYs.map((g, i) => (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={yAt(g)} y2={yAt(g)} stroke="#1e293b" strokeWidth={1} />
            <text x={PAD_L - 6} y={yAt(g) + 3} fill="#64748b" fontSize={9} textAnchor="end" fontFamily="monospace">
              {g >= 0 ? "+" : ""}{g.toFixed(1)}%
            </text>
          </g>
        ))}
        {/* Zero line */}
        {lo < 0 && hi > 0 && (
          <line x1={PAD_L} x2={W - PAD_R} y1={yAt(0)} y2={yAt(0)} stroke="#475569" strokeDasharray="3,3" strokeWidth={1} />
        )}
        {/* X labels (day of month) */}
        {[1, 5, 10, 15, 20, 25, 30].map((d) => (
          <g key={d}>
            <line x1={xAt(d)} x2={xAt(d)} y1={PAD_T + innerH} y2={PAD_T + innerH + 3} stroke="#475569" />
            <text x={xAt(d)} y={H - 8} fill="#64748b" fontSize={10} textAnchor="middle" fontFamily="monospace">
              {d}
            </text>
          </g>
        ))}
        <text x={PAD_L + innerW / 2} y={H - 1} fill="#475569" fontSize={9} textAnchor="middle">
          Day of {MONTHS[month]}
        </text>

        {/* Min/Max envelope */}
        <path d={envelopePath(result.envelopeMin.values, result.envelopeMax.values)} fill="#3b82f6" fillOpacity={0.08} stroke="none" />

        {/* Average lines */}
        <path d={path(result.avg15.values)} stroke="#a78bfa" strokeWidth={1.4} fill="none" strokeOpacity={0.65} />
        <path d={path(result.avg10.values)} stroke="#60a5fa" strokeWidth={1.6} fill="none" strokeOpacity={0.85} />
        <path d={path(result.avg5.values)} stroke="#22c55e" strokeWidth={2} fill="none" />
        <path d={path(result.ytd.values)} stroke="#f97316" strokeWidth={2.2} fill="none" />

        {/* Crosshair + per-series dots */}
        {hoverDom != null && (
          <g pointerEvents="none">
            <line
              x1={hoverX}
              x2={hoverX}
              y1={PAD_T}
              y2={PAD_T + innerH}
              stroke="#cbd5e1"
              strokeOpacity={0.5}
              strokeWidth={1}
              strokeDasharray="3,3"
            />
            {tooltipSeries.map((s) =>
              s.value != null ? (
                <circle
                  key={s.label}
                  cx={hoverX}
                  cy={yAt(s.value)}
                  r={3.5}
                  fill={s.color}
                  stroke="#0f172a"
                  strokeWidth={1.5}
                />
              ) : null
            )}
          </g>
        )}
      </svg>

      {/* Tooltip overlay */}
      {hoverDom != null && (
        <div
          className="absolute pointer-events-none bg-[#0f172a]/95 border border-[#1e293b] rounded-md px-2.5 py-2 text-[11px] shadow-xl backdrop-blur-sm"
          style={{
            left: flip ? "auto" : `calc(${tooltipPct}% + 10px)`,
            right: flip ? `calc(${100 - tooltipPct}% + 10px)` : "auto",
            top: 8,
            minWidth: 160,
          }}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#64748b] mb-1.5">
            Day {hoverDom} of {MONTHS[month]}
          </div>
          <div className="space-y-0.5">
            {tooltipSeries.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-[#94a3b8]">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm"
                    style={{ background: s.color }}
                  />
                  {s.label}
                </span>
                <span className="font-bold tabular-nums" style={{ color: s.color }}>
                  {s.value != null
                    ? `${s.value >= 0 ? "+" : ""}${s.value.toFixed(2)}%`
                    : "—"}
                </span>
              </div>
            ))}
            {rangeMin != null && rangeMax != null && (
              <div className="flex items-center justify-between gap-3 pt-1 mt-1 border-t border-[#1e293b]">
                <span className="flex items-center gap-1.5 text-[#94a3b8]">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#3b82f6]/30" />
                  Range
                </span>
                <span className="font-semibold tabular-nums text-[#94a3b8]">
                  {rangeMin.toFixed(1)}% / {rangeMax >= 0 ? "+" : ""}{rangeMax.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function niceStep(raw: number): number {
  const exp = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exp);
  const m = raw / base;
  if (m < 1.5) return base;
  if (m < 3) return 2 * base;
  if (m < 7) return 5 * base;
  return 10 * base;
}

// ── Main panel ───────────────────────────────────────────────────
export default function SeasonalityPanel() {
  const [symbol, setSymbol] = useState<string>("NQ=F");
  const [month, setMonth] = useState<number>(new Date().getMonth());
  const [bars, setBars] = useState<DailyBar[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSymbolRef = useRef<string>("");

  const inst = INSTRUMENTS.find((i) => i.symbol === symbol) ?? INSTRUMENTS[0];

  const grouped = useMemo(() => {
    const m = new Map<string, Instrument[]>();
    for (const i of INSTRUMENTS) {
      if (!m.has(i.group)) m.set(i.group, []);
      m.get(i.group)!.push(i);
    }
    return Array.from(m.entries());
  }, []);

  const load = useCallback(async (sym: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSeries(sym);
      setBars(data);
      lastSymbolRef.current = sym;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
      setBars(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load on first mount + when symbol changes
  useEffect(() => {
    if (lastSymbolRef.current !== symbol) load(symbol);
  }, [symbol, load]);

  const result = useMemo(() => {
    if (!bars || bars.length === 0) return null;
    return buildSeasonality(bars, month);
  }, [bars, month]);

  const stats = useMemo(() => {
    if (!result) return null;
    const rets = result.monthlyReturns;
    if (rets.length === 0) return null;
    const avg = rets.reduce((s, r) => s + r.ret, 0) / rets.length;
    const wins = rets.filter((r) => r.ret > 0).length;
    const winRate = (wins / rets.length) * 100;
    const best = rets.reduce((b, r) => (r.ret > b.ret ? r : b));
    const worst = rets.reduce((b, r) => (r.ret < b.ret ? r : b));
    return { avg, winRate, best, worst, samples: rets.length };
  }, [result]);

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1e293b] flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#f1f5f9]">Seasonality</h2>
          <p className="text-xs text-[#64748b] mt-0.5">
            Average price path across the last 15 / 10 / 5 years vs. year to date
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="px-5 py-4 border-b border-[#1e293b] grid grid-cols-1 sm:grid-cols-[1fr_220px_auto] gap-3 items-end">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748b] mb-1">
            Instrument
          </label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full bg-[#0f172a] border border-[#1e293b] text-[#e2e8f0] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#3b82f6]"
          >
            {grouped.map(([group, items]) => (
              <optgroup key={group} label={`— ${group} —`}>
                {items.map((i) => (
                  <option key={i.symbol} value={i.symbol}>{i.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748b] mb-1">
            Month
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-full bg-[#0f172a] border border-[#1e293b] text-[#e2e8f0] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#3b82f6]"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => load(symbol)}
          disabled={loading}
          className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-md text-sm transition-colors h-[38px]"
        >
          {loading ? "Loading..." : "Calculate"}
        </button>
      </div>

      {/* Header summary */}
      <div className="px-5 py-3 border-b border-[#1e293b] flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#64748b] mr-1.5">Instrument</span>
          <span className="text-sm font-semibold text-white">{inst.name}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#64748b] mr-1.5">Month</span>
          <span className="text-sm font-semibold text-white">{MONTHS[month]}</span>
        </div>
        {result && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#64748b] mr-1.5">Years</span>
            <span className="text-sm font-semibold text-white">{result.yearsAvailable}</span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-5 py-2 border-b border-[#1e293b] flex flex-wrap gap-4 text-[11px] text-[#94a3b8]">
        <Legend swatchClass="bg-[#a78bfa]/65" label="15y avg" />
        <Legend swatchClass="bg-[#60a5fa]" label="10y avg" />
        <Legend swatchClass="bg-[#22c55e]" label="5y avg" />
        <Legend swatchClass="bg-[#f97316]" label="Year to date" />
        <Legend swatchClass="bg-[#3b82f6]/30" label="Min/Max range" />
      </div>

      {/* Chart */}
      <div className="px-5 py-4">
        {error ? (
          <div className="p-8 text-center text-red-400 text-sm">Error: {error}</div>
        ) : loading && !result ? (
          <div className="p-8 text-center text-[#64748b] text-sm">Loading {inst.name}…</div>
        ) : result ? (
          <SeasonalChart result={result} month={month} />
        ) : (
          <div className="p-8 text-center text-[#64748b] text-sm">No data</div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="px-5 py-3 border-t border-[#1e293b] grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <Stat label="Avg Return" value={`${stats.avg >= 0 ? "+" : ""}${stats.avg.toFixed(2)}%`} positive={stats.avg >= 0} />
          <Stat label="Win Rate" value={`${stats.winRate.toFixed(0)}%`} positive={stats.winRate >= 50} />
          <Stat label="Best Year" value={`${stats.best.year} ${stats.best.ret >= 0 ? "+" : ""}${stats.best.ret.toFixed(1)}%`} positive />
          <Stat label="Worst Year" value={`${stats.worst.year} ${stats.worst.ret.toFixed(1)}%`} positive={false} />
          <Stat label="Samples" value={`${stats.samples} yrs`} />
        </div>
      )}
    </div>
  );
}

function Legend({ swatchClass, label }: { swatchClass: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-3 h-2 rounded-sm ${swatchClass}`} />
      {label}
    </span>
  );
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  const color =
    positive === undefined
      ? "text-white"
      : positive
        ? "text-green-400"
        : "text-red-400";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[#64748b]">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
