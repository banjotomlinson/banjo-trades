"use client";

import { useEffect, useMemo, useState } from "react";

interface Trade {
  id: string;
  date: string; // YYYY-MM-DD
  pnl: number;
  note?: string;
}

const STORAGE_KEY = "banjo-pnl-trades-v1";

function fmtUsd(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtRatio(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  return n.toFixed(2);
}

interface Stats {
  totalPnl: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  winLossRatio: number;
  expectancy: number;
  bestDay: { date: string; pnl: number } | null;
  worstDay: { date: string; pnl: number } | null;
  maxDrawdown: number;
  drawdownPctOfPeak: number;
  equity: { date: string; cum: number; pnl: number }[];
  dowTotals: number[]; // Sun..Sat
  dowCounts: number[];
  currentStreak: { kind: "win" | "loss" | null; length: number };
  longestWin: number;
  longestLoss: number;
  activeDays: number;
}

function compute(trades: Trade[]): Stats {
  if (trades.length === 0) {
    return {
      totalPnl: 0,
      totalTrades: 0,
      winRate: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      winLossRatio: 0,
      expectancy: 0,
      bestDay: null,
      worstDay: null,
      maxDrawdown: 0,
      drawdownPctOfPeak: 0,
      equity: [],
      dowTotals: [0, 0, 0, 0, 0, 0, 0],
      dowCounts: [0, 0, 0, 0, 0, 0, 0],
      currentStreak: { kind: null, length: 0 },
      longestWin: 0,
      longestLoss: 0,
      activeDays: 0,
    };
  }

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const winRate = trades.length > 0 ? wins.length / trades.length : 0;
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity;
  const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : Infinity;
  const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;

  // Per-day aggregation
  const dayMap = new Map<string, number>();
  for (const t of trades) dayMap.set(t.date, (dayMap.get(t.date) ?? 0) + t.pnl);
  const dates = [...dayMap.keys()].sort();
  const equity: Stats["equity"] = [];
  let cum = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let peakAtMaxDD = 0;
  for (const d of dates) {
    const dayPnl = dayMap.get(d)!;
    cum += dayPnl;
    if (cum > peak) peak = cum;
    const dd = peak - cum;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
      peakAtMaxDD = peak;
    }
    equity.push({ date: d, cum, pnl: dayPnl });
  }
  const drawdownPctOfPeak = peakAtMaxDD > 0 ? maxDrawdown / peakAtMaxDD : 0;

  // Best/worst day
  let bestDay: Stats["bestDay"] = null;
  let worstDay: Stats["worstDay"] = null;
  for (const [date, pnl] of dayMap.entries()) {
    if (!bestDay || pnl > bestDay.pnl) bestDay = { date, pnl };
    if (!worstDay || pnl < worstDay.pnl) worstDay = { date, pnl };
  }

  // Day of week
  const dowTotals = [0, 0, 0, 0, 0, 0, 0];
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const t of trades) {
    const dow = new Date(t.date + "T00:00:00").getDay();
    dowTotals[dow] += t.pnl;
    dowCounts[dow] += 1;
  }

  // Day-level streaks (consecutive winning vs losing days)
  let longestWin = 0;
  let longestLoss = 0;
  let run = 0;
  let runKind: "win" | "loss" | null = null;
  for (const e of equity) {
    const k = e.pnl > 0 ? "win" : e.pnl < 0 ? "loss" : null;
    if (k === null) {
      run = 0;
      runKind = null;
      continue;
    }
    if (k === runKind) run += 1;
    else {
      run = 1;
      runKind = k;
    }
    if (k === "win") longestWin = Math.max(longestWin, run);
    if (k === "loss") longestLoss = Math.max(longestLoss, run);
  }
  // Current streak — walk back from the last day with non-zero pnl
  let currentKind: "win" | "loss" | null = null;
  let currentLen = 0;
  for (let i = equity.length - 1; i >= 0; i--) {
    const k = equity[i].pnl > 0 ? "win" : equity[i].pnl < 0 ? "loss" : null;
    if (currentKind === null) {
      if (k === null) continue;
      currentKind = k;
      currentLen = 1;
    } else {
      if (k === currentKind) currentLen += 1;
      else break;
    }
  }

  return {
    totalPnl,
    totalTrades: trades.length,
    winRate,
    profitFactor,
    avgWin,
    avgLoss,
    winLossRatio,
    expectancy,
    bestDay,
    worstDay,
    maxDrawdown,
    drawdownPctOfPeak,
    equity,
    dowTotals,
    dowCounts,
    currentStreak: { kind: currentKind, length: currentLen },
    longestWin,
    longestLoss,
    activeDays: dates.length,
  };
}

export default function JournalAnalytics() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Trade[];
        if (Array.isArray(parsed)) setTrades(parsed);
      }
    } catch {
      /* ignore */
    }
    // Re-read whenever PnLCalendar's storage gets touched in another tab.
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        try {
          const arr = e.newValue ? (JSON.parse(e.newValue) as Trade[]) : [];
          if (Array.isArray(arr)) setTrades(arr);
        } catch {
          /* ignore */
        }
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const stats = useMemo(() => compute(trades), [trades]);

  if (!mounted) return null;

  const empty = trades.length === 0;

  const pnlColor =
    stats.totalPnl > 0
      ? "text-bull"
      : stats.totalPnl < 0
        ? "text-bear"
        : "text-foreground";

  return (
    <div className="bg-panel border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">
          Performance Analytics
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Stats across every trade you&apos;ve logged. Updates as you add or remove entries.
        </p>
      </div>

      {empty ? (
        <div className="p-12 text-center text-muted text-sm">
          Log a few trades on the calendar above and your stats will populate here.
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {/* ── Top stat tiles ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile label="Net P&L" value={fmtUsd(stats.totalPnl)} valueClass={pnlColor} sub={`${stats.activeDays} active ${stats.activeDays === 1 ? "day" : "days"}`} />
            <Tile
              label="Win Rate"
              value={fmtPct(stats.winRate)}
              valueClass={stats.winRate >= 0.5 ? "text-bull" : "text-bear"}
              sub={`${stats.totalTrades} trade${stats.totalTrades === 1 ? "" : "s"}`}
            />
            <Tile
              label="Profit Factor"
              value={fmtRatio(stats.profitFactor)}
              valueClass={stats.profitFactor >= 1 ? "text-bull" : "text-bear"}
              sub="gross profit / loss"
            />
            <Tile
              label="Expectancy"
              value={fmtUsd(stats.expectancy)}
              valueClass={stats.expectancy >= 0 ? "text-bull" : "text-bear"}
              sub="per trade"
            />
          </div>

          {/* ── Equity curve ── */}
          <div className="bg-[#0f172a] border border-border rounded-lg p-4">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                Equity Curve
              </h3>
              <span className="text-xs text-muted">
                {stats.equity.length} day{stats.equity.length === 1 ? "" : "s"}
              </span>
            </div>
            <EquityCurve points={stats.equity} />
          </div>

          {/* ── Secondary stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Tile label="Avg Win" value={fmtUsd(stats.avgWin)} valueClass="text-bull" />
            <Tile label="Avg Loss" value={fmtUsd(stats.avgLoss)} valueClass="text-bear" />
            <Tile
              label="Win/Loss Ratio"
              value={fmtRatio(stats.winLossRatio)}
              valueClass={stats.winLossRatio >= 1 ? "text-bull" : "text-bear"}
              sub="avg win / avg loss"
            />
            <Tile
              label="Best Day"
              value={stats.bestDay ? fmtUsd(stats.bestDay.pnl) : "—"}
              valueClass="text-bull"
              sub={stats.bestDay ? prettyDate(stats.bestDay.date) : ""}
            />
            <Tile
              label="Worst Day"
              value={stats.worstDay ? fmtUsd(stats.worstDay.pnl) : "—"}
              valueClass="text-bear"
              sub={stats.worstDay ? prettyDate(stats.worstDay.date) : ""}
            />
            <Tile
              label="Max Drawdown"
              value={fmtUsd(stats.maxDrawdown)}
              valueClass="text-bear"
              sub={
                stats.drawdownPctOfPeak > 0
                  ? `-${(stats.drawdownPctOfPeak * 100).toFixed(1)}% from peak`
                  : "no drawdown yet"
              }
            />
          </div>

          {/* ── Two-up: day of week + streaks ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
            <div className="bg-[#0f172a] border border-border rounded-lg p-4">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  By Day of Week
                </h3>
                <span className="text-xs text-muted">net P&amp;L per weekday</span>
              </div>
              <DayOfWeekChart totals={stats.dowTotals} counts={stats.dowCounts} />
            </div>
            <div className="bg-[#0f172a] border border-border rounded-lg p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                Streaks
              </h3>
              <StreakRow
                label="Current"
                value={
                  stats.currentStreak.kind
                    ? `${stats.currentStreak.length} ${stats.currentStreak.kind === "win" ? "wins" : "losses"}`
                    : "—"
                }
                positive={stats.currentStreak.kind === "win"}
              />
              <StreakRow label="Longest win streak" value={`${stats.longestWin} day${stats.longestWin === 1 ? "" : "s"}`} positive />
              <StreakRow label="Longest loss streak" value={`${stats.longestLoss} day${stats.longestLoss === 1 ? "" : "s"}`} positive={false} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  valueClass = "text-foreground",
  sub,
}: {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
}) {
  return (
    <div className="bg-[#0f172a] border border-border rounded-lg px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted font-bold">
        {label}
      </div>
      <div className={`text-xl font-bold tabular-nums mt-1 ${valueClass}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function StreakRow({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span
        className={`text-sm font-bold tabular-nums ${positive ? "text-bull" : "text-bear"}`}
      >
        {value}
      </span>
    </div>
  );
}

function prettyDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Equity curve ──────────────────────────────────────────────────
function EquityCurve({ points }: { points: { date: string; cum: number }[] }) {
  const W = 800;
  const H = 200;
  const PAD_L = 50;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 24;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  if (points.length === 0) {
    return <div className="text-muted text-xs text-center py-8">No data yet</div>;
  }

  const cums = points.map((p) => p.cum);
  const yMin = Math.min(0, ...cums);
  const yMax = Math.max(0, ...cums);
  const yPad = Math.max(1, (yMax - yMin) * 0.1);
  const lo = yMin - yPad;
  const hi = yMax + yPad;

  const xAt = (i: number) =>
    points.length === 1 ? PAD_L + innerW / 2 : PAD_L + (i / (points.length - 1)) * innerW;
  const yAt = (v: number) => PAD_T + innerH - ((v - lo) / (hi - lo)) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(2)},${yAt(p.cum).toFixed(2)}`)
    .join(" ");

  const areaPath =
    `${linePath} L${xAt(points.length - 1).toFixed(2)},${yAt(0).toFixed(2)} L${xAt(0).toFixed(2)},${yAt(0).toFixed(2)} Z`;

  const finalCum = points[points.length - 1].cum;
  const lineColor = finalCum >= 0 ? "#22c55e" : "#ef4444";
  const fillId = finalCum >= 0 ? "eq-fill-bull" : "eq-fill-bear";

  // Y ticks
  const tickStep = niceStep((hi - lo) / 4);
  const ticks: number[] = [];
  const start = Math.ceil(lo / tickStep) * tickStep;
  for (let v = start; v <= hi; v += tickStep) ticks.push(v);

  // X labels: 4 evenly spaced dates
  const xLabels = points.length <= 4
    ? points.map((p, i) => ({ i, label: shortDate(p.date) }))
    : [0, 1, 2, 3].map((k) => {
        const i = Math.round((k / 3) * (points.length - 1));
        return { i, label: shortDate(points[i].date) };
      });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" className="block">
      <defs>
        <linearGradient id="eq-fill-bull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="eq-fill-bear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Y gridlines */}
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={PAD_L} x2={W - PAD_R} y1={yAt(v)} y2={yAt(v)} stroke="#1e293b" strokeWidth={1} />
          <text x={PAD_L - 6} y={yAt(v) + 3} fill="#64748b" fontSize={9} textAnchor="end" fontFamily="monospace">
            ${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </text>
        </g>
      ))}
      {/* Zero line emphasised */}
      {lo < 0 && hi > 0 && (
        <line x1={PAD_L} x2={W - PAD_R} y1={yAt(0)} y2={yAt(0)} stroke="#475569" strokeDasharray="3,3" />
      )}
      {/* X labels */}
      {xLabels.map((l) => (
        <text
          key={l.i}
          x={xAt(l.i)}
          y={H - 6}
          fill="#64748b"
          fontSize={10}
          textAnchor="middle"
          fontFamily="monospace"
        >
          {l.label}
        </text>
      ))}
      {/* Filled area */}
      <path d={areaPath} fill={`url(#${fillId})`} stroke="none" />
      {/* Curve */}
      <path d={linePath} stroke={lineColor} strokeWidth={2} fill="none" />
      {/* End dot */}
      <circle cx={xAt(points.length - 1)} cy={yAt(finalCum)} r={3.5} fill={lineColor} stroke="#0f172a" strokeWidth={1.5} />
    </svg>
  );
}

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const exp = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exp);
  const m = raw / base;
  if (m < 1.5) return base;
  if (m < 3) return 2 * base;
  if (m < 7) return 5 * base;
  return 10 * base;
}

function shortDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ── Day of week ───────────────────────────────────────────────────
const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function DayOfWeekChart({
  totals,
  counts,
}: {
  totals: number[];
  counts: number[];
}) {
  // Skip days with zero counts at the edges (no Sunday/Saturday for most traders).
  const days = [1, 2, 3, 4, 5, 6, 0].map((idx) => ({
    idx,
    label: DOW_LABELS[idx],
    pnl: totals[idx],
    count: counts[idx],
  }));
  // Show only weekdays + weekends with activity
  const visible = days.filter(
    (d) => d.idx >= 1 && d.idx <= 5
      ? true
      : d.count > 0
  );

  const maxAbs = Math.max(1, ...visible.map((d) => Math.abs(d.pnl)));

  return (
    <div className="space-y-2">
      {visible.map((d) => {
        const pct = (Math.abs(d.pnl) / maxAbs) * 100;
        const color = d.pnl > 0 ? "bg-bull" : d.pnl < 0 ? "bg-bear" : "bg-muted/40";
        const valueColor = d.pnl > 0 ? "text-bull" : d.pnl < 0 ? "text-bear" : "text-muted";
        return (
          <div key={d.idx} className="flex items-center gap-3">
            <span className="text-[11px] text-muted font-semibold w-8 shrink-0">
              {d.label}
            </span>
            <div className="flex-1 h-6 bg-[#111827] rounded relative overflow-hidden">
              <div
                className={`h-full ${color} transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="text-right shrink-0 w-24">
              <div className={`text-xs font-bold tabular-nums ${valueColor}`}>
                {fmtUsd(d.pnl)}
              </div>
              <div className="text-[10px] text-muted">
                {d.count} {d.count === 1 ? "trade" : "trades"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
