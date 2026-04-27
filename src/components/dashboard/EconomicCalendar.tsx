"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CalendarEvent } from "@/lib/data";
import { biasForEvent, summarizeDay, type Bias } from "@/lib/eventBias";
import { useCalendarFilter } from "@/components/providers/CalendarFilterProvider";

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Unique-enough key so re-fetched months can be merged without duplicates.
function eventKey(e: CalendarEvent): string {
  return `${e.date}|${e.country}|${e.impact}|${e.title}`;
}

type ViewMode = "daily" | "weekly" | "monthly";
type ImpactFilter = "all" | "high" | "medium" | "low";
type CategoryKey =
  | "indices"
  | "futures"
  | "commodities"
  | "crypto"
  | "forex";

const IMPACT_COLORS: Record<string, string> = {
  high: "bg-danger",
  medium: "bg-warning",
  low: "bg-muted/60",
};

const IMPACT_PILL_ACTIVE: Record<string, string> = {
  all: "bg-accent text-white",
  high: "bg-danger text-white",
  medium: "bg-warning text-black",
  low: "bg-[#475569] text-white",
};

// Which currencies each category cares about.
// Non-forex categories are USD-driven; forex sees every major pair.
const CATEGORY_CURRENCIES: Record<CategoryKey, string[] | "all"> = {
  indices: ["US", "USD"],
  futures: ["US", "USD"],
  commodities: ["US", "USD"],
  crypto: ["US", "USD"],
  forex: "all",
};

// Top 10 most-traded currencies (BIS 2022 turnover survey).
// Finnhub returns 2-letter country codes, so we filter by those.
const TOP_CURRENCIES = [
  "US",
  "EU",
  "JP",
  "GB",
  "CN",
  "AU",
  "CA",
  "CH",
  "HK",
  "NZ",
] as const;

interface EconomicCalendarProps {
  initialEvents?: CalendarEvent[];
  view?: ViewMode;
  category?: CategoryKey;
}

export default function EconomicCalendar({
  initialEvents,
  view: viewProp,
  category,
}: EconomicCalendarProps) {
  const hasInitial = initialEvents && initialEvents.length > 0;
  const [events, setEvents] = useState<CalendarEvent[]>(
    hasInitial ? initialEvents : []
  );
  const [internalView, setInternalView] = useState<ViewMode>("daily");
  const view = viewProp ?? internalView;
  const viewControlled = viewProp !== undefined;
  const [filter, setFilter] = useState<ImpactFilter>("high");
  const [loading, setLoading] = useState(!hasInitial);
  const [dateOffset, setDateOffset] = useState(0);

  // Currency multi-select lives in a dashboard-scoped provider so the
  // countdown on the home page can filter by the same selection.
  const {
    selection: currencySelection,
    setSelection: setCurrencySelection,
    toggleCurrency,
    matches: matchesCategory,
  } = useCalendarFilter();

  // When the parent embeds this calendar with a fixed category, seed the
  // provider on first mount so the user arrives pre-filtered (but is then
  // free to widen the selection).
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !category) return;
    seededRef.current = true;
    const cats = CATEGORY_CURRENCIES[category];
    setCurrencySelection(cats === "all" ? "all" : [...cats]);
  }, [category, setCurrencySelection]);

  const availableCurrencies = useMemo(() => {
    // Always expose the top 10 so the picker is stable even before events load.
    // Keeps the canonical BIS turnover order so USD/EUR/JPY appear first.
    return [...TOP_CURRENCIES];
  }, []);

  // Tracks which date-range keys have already been fetched this session so
  // month navigation is idempotent and cheap.
  const loadedRanges = useRef<Set<string>>(new Set());

  // Tracks which view-window we're currently waiting on so we can show a
  // single loading state for the whole grid instead of letting partial
  // events pop in mid-fetch.
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const fetchRange = useCallback(
    async (from: string, to: string, forKey?: string) => {
      const cacheKey = `${from}_${to}`;
      if (loadedRanges.current.has(cacheKey)) {
        if (forKey) setPendingKey((p) => (p === forKey ? null : p));
        return;
      }
      loadedRanges.current.add(cacheKey);
      if (forKey) setPendingKey(forKey);
      try {
        const res = await fetch(`/api/calendar?from=${from}&to=${to}`);
        if (!res.ok) return;
        const data = await res.json();
        const incoming: CalendarEvent[] = data.events || [];
        // Merge into current events, deduped by (date|country|impact|title).
        setEvents((prev) => {
          const seen = new Map<string, CalendarEvent>();
          for (const e of prev) seen.set(eventKey(e), e);
          for (const e of incoming) seen.set(eventKey(e), e);
          return Array.from(seen.values());
        });
      } catch {
        loadedRanges.current.delete(cacheKey); // allow retry on transient failure
      } finally {
        setLoading(false);
        if (forKey) setPendingKey((p) => (p === forKey ? null : p));
      }
    },
    []
  );

  useEffect(() => {
    // Only fetch default window on mount if we had no initial data
    if (!hasInitial) {
      const today = new Date();
      const from = new Date(today);
      from.setDate(from.getDate() - 7);
      const to = new Date(today);
      to.setDate(to.getDate() + 45);
      fetchRange(ymd(from), ymd(to));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + dateOffset);

  // Build [start, end) window based on the active view.
  const rangeStart = new Date(baseDate);
  const rangeEnd = new Date(baseDate);
  if (view === "daily") {
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd.setHours(24, 0, 0, 0);
  } else if (view === "weekly") {
    // ISO week: Monday 00:00 → next Monday 00:00
    const dow = rangeStart.getDay(); // 0=Sun
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    rangeStart.setDate(rangeStart.getDate() + mondayOffset);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd.setTime(rangeStart.getTime());
    rangeEnd.setDate(rangeEnd.getDate() + 7);
  } else {
    rangeStart.setDate(1);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd.setTime(rangeStart.getTime());
    rangeEnd.setMonth(rangeEnd.getMonth() + 1);
  }

  // Whenever the visible range moves outside what's been loaded so far,
  // pull the surrounding window so the user sees events for any month they
  // scroll to. Monthly view uses the full 42-cell grid; daily/weekly pull
  // a 2-week buffer around the visible slice.
  const fetchKey = useMemo(() => {
    if (view === "monthly") {
      return `${rangeStart.getFullYear()}-${rangeStart.getMonth()}`;
    }
    return `${view}:${ymd(rangeStart)}`;
  }, [view, rangeStart]);

  useEffect(() => {
    let from: Date;
    let to: Date;
    if (view === "monthly") {
      from = new Date(rangeStart);
      from.setDate(1);
      from.setDate(from.getDate() - from.getDay()); // Sunday on/before 1st
      to = new Date(from);
      to.setDate(to.getDate() + 42);
    } else {
      from = new Date(rangeStart);
      from.setDate(from.getDate() - 14);
      to = new Date(rangeEnd);
      to.setDate(to.getDate() + 14);
    }
    fetchRange(ymd(from), ymd(to), fetchKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey, fetchRange]);

  const filtered = events.filter((e) => {
    if (filter !== "all" && e.impact !== filter) return false;
    if (!matchesCategory(e.country)) return false;
    const t = new Date(e.date).getTime();
    if (t < rangeStart.getTime() || t >= rangeEnd.getTime()) return false;
    return true;
  });

  const dateLabel =
    view === "daily"
      ? baseDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        })
      : view === "weekly"
      ? `Week of ${rangeStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}`
      : baseDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });

  return (
    <div className="bg-panel border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#f1f5f9]">
          Economic Calendar
        </h2>
        {!viewControlled && (
          <div className="flex gap-1 bg-background rounded-lg p-1 border border-border">
            {(["daily", "weekly", "monthly"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setInternalView(v)}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  view === v
                    ? "bg-accent text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 px-5 py-3 border-b border-border flex-wrap items-center">
        <span className="text-[10px] text-muted font-bold uppercase tracking-wider mr-1">
          Impact
        </span>
        {(["all", "high", "medium", "low"] as ImpactFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1 rounded-md text-xs font-semibold border transition-all ${
              filter === f
                ? `${IMPACT_PILL_ACTIVE[f]} border-transparent`
                : "border-border text-muted hover:text-foreground hover:border-muted"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && (
              <span className="ml-1.5 opacity-70">
                {
                  events.filter(
                    (e) => e.impact === f && matchesCategory(e.country)
                  ).length
                }
              </span>
            )}
          </button>
        ))}
      </div>

      {availableCurrencies.length > 0 && (
        <div className="flex gap-2 px-5 py-3 border-b border-border flex-wrap items-center">
          <span className="text-[10px] text-muted font-bold uppercase tracking-wider mr-1">
            Currency
          </span>
          <button
            onClick={() => setCurrencySelection("all")}
            className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all ${
              currencySelection === "all"
                ? "bg-accent text-white border-transparent"
                : "border-border text-muted hover:text-foreground hover:border-muted"
            }`}
          >
            All
          </button>
          {availableCurrencies.map((c) => {
            const active =
              currencySelection !== "all" && currencySelection.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleCurrency(c)}
                className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all ${
                  active
                    ? "bg-accent text-white border-transparent"
                    : "border-border text-muted hover:text-foreground hover:border-muted"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex gap-2 items-center">
          <button
            onClick={() =>
              setDateOffset(
                (d) => d - (view === "monthly" ? 30 : view === "weekly" ? 7 : 1)
              )
            }
            className="w-9 h-9 rounded-lg bg-[#1e293b] border border-[#334155] text-muted flex items-center justify-center hover:bg-[#334155] hover:text-white transition-all"
          >
            &larr;
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[180px] text-center">
            {dateLabel}
          </span>
          <button
            onClick={() =>
              setDateOffset(
                (d) => d + (view === "monthly" ? 30 : view === "weekly" ? 7 : 1)
              )
            }
            className="w-9 h-9 rounded-lg bg-[#1e293b] border border-[#334155] text-muted flex items-center justify-center hover:bg-[#334155] hover:text-white transition-all"
          >
            &rarr;
          </button>
        </div>
        <button
          onClick={() => setDateOffset(0)}
          className="border border-accent text-accent px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-accent hover:text-white transition-all"
        >
          Today
        </button>
      </div>

      {view === "monthly" ? (
        <MonthGrid
          monthStart={rangeStart}
          events={filtered}
          loading={loading || pendingKey !== null}
        />
      ) : (
        <div className="max-h-[400px] overflow-y-auto">
          {loading || pendingKey !== null ? (
            <div className="p-8 text-center text-muted text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm">
              No events match your filters
            </div>
          ) : (
            <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted uppercase tracking-wide border-b border-border">
                <th className="text-left px-5 py-2.5 w-12"></th>
                <th className="text-left px-3 py-2.5">Time</th>
                <th className="text-left px-3 py-2.5">Event</th>
                <th className="text-right px-3 py-2.5">Forecast</th>
                <th className="text-right px-3 py-2.5">Previous</th>
                <th className="text-right px-3 py-2.5">Actual</th>
                <th className="text-right px-5 py-2.5">Bias</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event, i) => {
                const eb = biasForEvent(event);
                return (
                  <tr
                    key={i}
                    className="border-b border-border/50 hover:bg-white/[0.02] transition-colors"
                    title={eb.watchFor}
                  >
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${
                          IMPACT_COLORS[event.impact]
                        }`}
                      />
                    </td>
                    <td className="px-3 py-3 text-muted whitespace-nowrap">
                      {new Date(event.date).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </td>
                    <td className="px-3 py-3 font-medium">{event.title}</td>
                    <td className="px-3 py-3 text-right text-muted">
                      {event.forecast || "-"}
                    </td>
                    <td className="px-3 py-3 text-right text-muted">
                      {event.previous || "-"}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold">
                      {event.actual || "-"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${BIAS_STYLE[eb.bias].text}`}
                      >
                        <span
                          className={`inline-block w-1.5 h-1.5 rounded-full ${BIAS_STYLE[eb.bias].dot}`}
                        />
                        {BIAS_STYLE[eb.bias].label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

const DOT_COLOR: Record<string, string> = {
  high: "bg-danger",
  medium: "bg-warning",
  low: "bg-muted/70",
};

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const BIAS_STYLE: Record<Bias, { dot: string; text: string; label: string }> = {
  bullish: { dot: "bg-bull", text: "text-bull", label: "Bullish" },
  bearish: { dot: "bg-bear", text: "text-bear", label: "Bearish" },
  mixed: { dot: "bg-warning", text: "text-warning", label: "Mixed" },
  neutral: { dot: "bg-muted", text: "text-muted", label: "Neutral" },
};

function MonthGrid({
  monthStart,
  events,
  loading,
}: {
  monthStart: Date;
  events: CalendarEvent[];
  loading: boolean;
}) {
  // 42-cell grid beginning on the Sunday on/before the 1st.
  const gridStart = new Date(monthStart);
  gridStart.setDate(1);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }

  // Bucket events by YYYY-MM-DD.
  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
    const list = byDay.get(key) ?? [];
    list.push(e);
    byDay.set(key, list);
  }
  // Sort per-day by time.
  for (const list of byDay.values()) {
    list.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  if (loading) {
    return (
      <div className="p-8 text-center text-muted text-sm">Loading...</div>
    );
  }

  return (
    <div className="grid grid-cols-7">
      {WEEKDAY_HEADERS.map((d) => (
        <div
          key={d}
          className="text-xs text-muted font-semibold text-center py-2 border-b border-border"
        >
          {d}
        </div>
      ))}
      {cells.map((d, i) => {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(d.getDate()).padStart(2, "0")}`;
        const dayEvents = byDay.get(key) ?? [];
        const inMonth = d.getMonth() === monthStart.getMonth();
        const isToday = key === todayKey;
        const hasEvents = dayEvents.length > 0 && inMonth;
        const summary = hasEvents ? summarizeDay(dayEvents) : null;
        // Flip the tooltip horizontally when the cell is in the right
        // columns, and vertically when it's in the bottom rows, so it
        // never clips off-screen.
        const col = i % 7;
        const row = Math.floor(i / 7);
        const tipSide = col >= 4 ? "right-0" : "left-0";
        // Tooltip touches the cell edge (no margin gap) so the cursor can
        // travel from cell to tooltip without leaving either, which would
        // otherwise drop the group-hover state.
        const tipVert = row >= 3 ? "bottom-full" : "top-full";

        return (
          <div
            key={i}
            className={`group relative border-r border-b border-border/60 min-h-[110px] p-2 ${
              !inMonth ? "opacity-30" : ""
            } ${
              isToday
                ? "bg-accent/10 ring-2 ring-inset ring-accent"
                : ""
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-xs font-bold ${
                  isToday ? "text-accent" : "text-muted font-medium"
                }`}
              >
                {d.getDate()}
              </span>
              {summary && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold ${BIAS_STYLE[summary.bias].text}`}
                  title={summary.label}
                >
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${BIAS_STYLE[summary.bias].dot}`}
                  />
                  {BIAS_STYLE[summary.bias].label}
                </span>
              )}
            </div>

            <div className="space-y-1">
              {dayEvents.slice(0, 3).map((e, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 text-[11px] leading-tight"
                >
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                      DOT_COLOR[e.impact]
                    }`}
                  />
                  <span className="truncate text-foreground/90">
                    {e.title}
                  </span>
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-[10px] text-muted font-medium">
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>

            {hasEvents && (
              <div
                className={`invisible opacity-0 group-hover:visible group-hover:opacity-100 hover:visible hover:opacity-100 absolute ${tipVert} ${tipSide} w-[320px] z-50 transition-opacity bg-panel border border-border rounded-lg shadow-xl p-3 text-left`}
              >
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
                  <div className="text-xs font-semibold text-foreground">
                    {d.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  {summary && (
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${BIAS_STYLE[summary.bias].text}`}
                    >
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${BIAS_STYLE[summary.bias].dot}`}
                      />
                      {summary.label}
                    </span>
                  )}
                </div>
                <div className="space-y-2 max-h-[260px] overflow-y-auto">
                  {dayEvents.map((e, idx) => {
                    const eb = biasForEvent(e);
                    return (
                      <div key={idx} className="text-[11px]">
                        <div className="flex items-start gap-1.5">
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${DOT_COLOR[e.impact]}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-muted">
                                {new Date(e.date).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                              <span className="text-muted">{e.country}</span>
                            </div>
                            <div className="text-foreground font-medium leading-tight">
                              {e.title}
                            </div>
                            {(e.forecast || e.previous || e.actual) && (
                              <div className="text-muted mt-0.5">
                                {e.actual && (
                                  <span>Actual: <span className="text-foreground font-semibold">{e.actual}</span> · </span>
                                )}
                                {e.forecast && <span>Fcst: {e.forecast} · </span>}
                                {e.previous && <span>Prev: {e.previous}</span>}
                              </div>
                            )}
                            <div
                              className={`mt-0.5 font-semibold ${BIAS_STYLE[eb.bias].text}`}
                            >
                              {eb.label}
                            </div>
                            <div className="text-muted leading-snug">
                              {eb.watchFor}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
