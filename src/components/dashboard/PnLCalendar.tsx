"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

export interface Trade {
  id: string;
  date: string; // ISO date "YYYY-MM-DD"
  pnl: number;
  note?: string;
}

interface PnLCalendarProps {
  trades?: Trade[]; // if provided, disables local editing
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const STORAGE_KEY = "banjo-pnl-trades-v1";

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

function makeId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export default function PnLCalendar({ trades: tradesProp }: PnLCalendarProps) {
  const controlled = tradesProp !== undefined;
  const today = new Date();
  const [cursor, setCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [localTrades, setLocalTrades] = useState<Trade[]>([]);
  const [editingDate, setEditingDate] = useState<string | null>(null);

  // Load: localStorage first for instant paint, then Supabase as authoritative source
  useEffect(() => {
    if (controlled) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Trade[];
        if (Array.isArray(parsed)) setLocalTrades(parsed);
      }
    } catch {}

    fetch("/api/trades")
      .then((res) => res.json())
      .then((data) => {
        if (data.trades && Array.isArray(data.trades) && data.trades.length > 0) {
          const mapped: Trade[] = data.trades.map((t: { id: string; date: string; pnl: number; note?: string | null }) => ({
            id: t.id,
            date: typeof t.date === "string" ? t.date.slice(0, 10) : t.date,
            pnl: Number(t.pnl),
            note: t.note || undefined,
          }));
          setLocalTrades(mapped);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        }
      })
      .catch(() => {});
  }, [controlled]);

  // Persist to localStorage on change
  useEffect(() => {
    if (controlled) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localTrades));
    } catch {}
  }, [localTrades, controlled]);

  const trades = controlled ? tradesProp! : localTrades;

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

  // Build 6-row x 7-col grid starting on the Sunday on/before the 1st.
  const gridStart = new Date(cursor);
  gridStart.setDate(1);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }

  const weekTotals = useMemo(() => {
    const out = new Map<
      string,
      { pnl: number; count: number; weekIdx: number }
    >();
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

  const dayTrades = editingDate
    ? trades.filter((t) => t.date === editingDate)
    : [];

  const addTrade = useCallback((date: string, pnl: number, note: string) => {
    const trade: Trade = { id: makeId(), date, pnl, note: note || undefined };
    setLocalTrades((prev) => [...prev, trade]);

    fetch("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trades: [{ id: trade.id, date: trade.date, pnl: trade.pnl, note: trade.note }] }),
    }).catch(() => {});
  }, []);

  const removeTrade = useCallback((id: string) => {
    setLocalTrades((prev) => prev.filter((t) => t.id !== id));

    fetch("/api/trades", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }, []);

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

          const pnlVal = isSaturday ? weekInfo?.pnl ?? 0 : entry?.pnl ?? 0;
          const amountColor =
            pnlVal > 0
              ? "text-bull"
              : pnlVal < 0
              ? "text-bear"
              : "text-muted";

          const tint =
            inMonth && entry && entry.pnl > 0
              ? "bg-[#052e16]/80"
              : inMonth && entry && entry.pnl < 0
              ? "bg-[#450a0a]/60"
              : "";

          const clickable = !controlled && inMonth;

          return (
            <button
              key={i}
              type="button"
              onClick={clickable ? () => setEditingDate(key) : undefined}
              disabled={!clickable}
              className={`relative border-r border-b border-border/60 min-h-[96px] p-2 text-left ${tint} ${
                !inMonth ? "opacity-30" : ""
              } ${
                clickable
                  ? "cursor-pointer hover:bg-white/[0.03] transition-colors"
                  : "cursor-default"
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
                    {weekInfo.count}{" "}
                    {weekInfo.count === 1 ? "trade" : "trades"}
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
              ) : clickable ? (
                <div className="mt-2 text-center text-[10px] text-muted opacity-0 group-hover:opacity-100">
                  + add
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      {editingDate && (
        <TradeEditor
          date={editingDate}
          trades={dayTrades}
          onAdd={(pnl, note) => addTrade(editingDate, pnl, note)}
          onRemove={removeTrade}
          onClose={() => setEditingDate(null)}
        />
      )}
    </div>
  );
}

function TradeEditor({
  date,
  trades,
  onAdd,
  onRemove,
  onClose,
}: {
  date: string;
  trades: Trade[];
  onAdd: (pnl: number, note: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const dayLabel = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const dayTotal = trades.reduce((s, t) => s + t.pnl, 0);
  const totalColor =
    dayTotal > 0 ? "text-bull" : dayTotal < 0 ? "text-bear" : "text-muted";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(amount.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(n) || n === 0) {
      setError("Enter a non-zero amount (use - for a loss).");
      return;
    }
    onAdd(n, note.trim());
    setAmount("");
    setNote("");
    setError("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-panel border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground">
              {dayLabel}
            </div>
            <div className={`text-lg font-bold ${totalColor}`}>
              {formatCurrency(dayTotal)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md text-muted hover:text-white hover:bg-[#334155] transition-colors"
            aria-label="Close"
          >
            x
          </button>
        </div>

        {trades.length > 0 && (
          <div className="max-h-48 overflow-y-auto border-b border-border">
            {trades.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between px-5 py-2.5 border-b border-border/40 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm font-bold ${
                      t.pnl >= 0 ? "text-bull" : "text-bear"
                    }`}
                  >
                    {formatCurrency(t.pnl)}
                  </div>
                  {t.note && (
                    <div className="text-xs text-muted truncate">{t.note}</div>
                  )}
                </div>
                <button
                  onClick={() => onRemove(t.id)}
                  className="text-muted hover:text-bear transition-colors text-lg px-2"
                  aria-label="Delete trade"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs text-muted font-semibold mb-1">
              Amount (use negative for losses)
            </label>
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 228.28 or -75.50"
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-muted font-semibold mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="NQ long, ORB setup, etc."
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
            />
          </div>
          {error && <div className="text-xs text-bear">{error}</div>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 bg-accent text-white px-4 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-all"
            >
              Add trade
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-semibold border border-border text-muted hover:text-white hover:border-muted transition-all"
            >
              Done
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
