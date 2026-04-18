"use client";

import { useMemo, useState } from "react";

export interface Trade {
  date: string; // ISO date "YYYY-MM-DD"
  pnl: number;
}

interface PnLCalendarProps {
  trades?: Trade[];
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatCurrency(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Demo seed — mirrors the TopStep screenshot for Apr 2026.
// Replace via the `trades` prop once a real trades source is wired.
const DEMO_TRADES: Trade[] = [
  { date: "2026-04-07", pnl: 120.14 },
  { date: "2026-04-07", pnl: 80.14 },
  { date: "2026-04-14", pnl: 180.09 },
  { date: "2026-04-17", pnl: 200.0 },
  { date: "2026-04-17", pnl: 145.06 },
];

export default function PnLCalendar({ trades = DEMO_TRADES }: PnLCalendarProps) {
  const today = new Date();
  const [cursor, setCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  // Group trades by YYYY-MM-DD.
  const byDay = useMemo(() => {
    const m = new Map<string, { pnl: number; count: number }>();
    for (const t of trades) {
      const entry = m.get(t.date) ?? { pnl: 0, count: 0 };
      entry.pnl += t.pnl;
      entry.count += 1;
      m.set(t.date, entry);
    }
    return m;
  }, [trades]);

  // Build 6-row × 7-col grid starting on the Sunday on/before the 1st.
  const gridStart = new Date(cursor);
  gridStart.setDate(1);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay()); // back to Sunday

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }

  // Weekly totals keyed by the Saturday of each row.
  const weekTotals = useMemo(() => {
    const out = new Map<string, { pnl: number; count: number; weekIdx: number }>();
    for (let row = 0; row < 6; row++) {
      let pnl = 0;
      let count = 0;
      for (let col = 0; col < 7; col++) {
        const d = cells[row * 7 + col];
        const entry = byDay.get(ymd(d));
        if (entry && d.getMonth() === cursor.getMonth()) {
          pnl += entry.pnl;
          count += entry.count;
        }
      }
      const sat = cells[row * 7 + 6];
      out.set(ymd(sat), { pnl, count, weekIdx: row + 1 });
    }
    return out;
  }, [cells, byDay, cursor]);

  const monthlyPnl = useMemo(() => {
    let total = 0;
    for (const [date, entry] of byDay.entries()) {
      const d = new Date(date + "T00:00:00");
      if (
        d.getFullYear() === cursor.getFullYear() &&
        d.getMonth() === cursor.getMonth()
      ) {
        total += entry.pnl;
      }
    }
    return total;
  }, [byDay, cursor]);

  const monthLabel = cursor.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const goPrev = () =>
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const goNext = () =>
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  const goToday = () =>
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));

  const pnlColor =
    monthlyPnl > 0
      ? "text-bull"
      : monthlyPnl < 0
      ? "text-bear"
      : "text-foreground";

  return (
    <div className="bg-panel border border-border rounded-xl overflow-hidden">
      <div className="pt-6 pb-4 text-center">
        <div className="text-base font-medium text-muted">
          Monthly P/L:{" "}
          <span className={`text-xl font-bold ${pnlColor}`}>
            {formatCurrency(monthlyPnl)}
          </span>
        </div>
      </div>

      <div className="px-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="w-8 h-8 rounded-md bg-[#1e293b] border border-[#334155] text-muted flex items-center justify-center hover:bg-[#334155] hover:text-white transition-all"
            aria-label="Previous month"
          >
            &larr;
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[110px] text-center">
            {monthLabel}
          </span>
          <button
            onClick={goNext}
            className="w-8 h-8 rounded-md bg-[#1e293b] border border-[#334155] text-muted flex items-center justify-center hover:bg-[#334155] hover:text-white transition-all"
            aria-label="Next month"
          >
            &rarr;
          </button>
        </div>
        <button
          onClick={goToday}
          className="border border-border text-muted px-4 py-1.5 rounded-md text-xs font-semibold hover:text-white hover:border-muted transition-all"
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 border-t border-border">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-xs text-muted font-semibold text-center py-2 border-b border-border"
          >
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          const key = ymd(d);
          const entry = byDay.get(key);
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = ymd(d) === ymd(today);
          const isSaturday = d.getDay() === 6;
          const weekInfo = isSaturday ? weekTotals.get(key) : undefined;

          // Pick the color for any $ amount displayed.
          const pnlVal = isSaturday ? weekInfo?.pnl ?? 0 : entry?.pnl ?? 0;
          const amountColor =
            pnlVal > 0
              ? "text-bull"
              : pnlVal < 0
              ? "text-bear"
              : "text-muted";

          // Background tint for profitable days (dark green wash).
          const tint =
            inMonth && entry && entry.pnl > 0
              ? "bg-[#052e16]/80"
              : inMonth && entry && entry.pnl < 0
              ? "bg-[#450a0a]/60"
              : "";

          return (
            <div
              key={i}
              className={`relative border-r border-b border-border/60 min-h-[96px] p-2 ${tint} ${
                !inMonth ? "opacity-30" : ""
              }`}
            >
              <div className="flex items-center">
                {isToday ? (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent text-white text-xs font-bold">
                    {d.getDate()}
                  </span>
                ) : (
                  <span className="text-xs text-muted font-medium">
                    {d.getDate()}
                  </span>
                )}
              </div>

              {isSaturday && inMonth && weekInfo ? (
                <div className="mt-1 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-muted font-semibold">
                    Week {weekInfo.weekIdx}
                  </div>
                  <div className={`text-sm font-bold ${amountColor}`}>
                    {formatCurrency(weekInfo.pnl)}
                  </div>
                  <div className="text-[10px] text-muted">
                    {weekInfo.count} {weekInfo.count === 1 ? "trade" : "trades"}
                  </div>
                </div>
              ) : entry && inMonth ? (
                <div className="mt-2 text-center">
                  <div className={`text-sm font-bold ${amountColor}`}>
                    {formatCurrency(entry.pnl)}
                  </div>
                  <div className="text-[10px] text-muted">
                    {entry.count} {entry.count === 1 ? "trade" : "trades"}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
