"use client";

import { useCallback, useEffect, useState } from "react";
import type { CalendarEvent } from "@/lib/data";

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

  const currencyAllow = category ? CATEGORY_CURRENCIES[category] : ["US", "USD"];
  const matchesCategory = useCallback(
    (country: string) =>
      currencyAllow === "all" ? true : currencyAllow.includes(country),
    [currencyAllow]
  );

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch on mount if we had no initial data
    if (!hasInitial) {
      fetchEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchEvents]);

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

      <div className="flex gap-2 px-5 py-3 border-b border-border flex-wrap">
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

      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setDateOffset((d) => d - 1)}
            className="w-9 h-9 rounded-lg bg-[#1e293b] border border-[#334155] text-muted flex items-center justify-center hover:bg-[#334155] hover:text-white transition-all"
          >
            &larr;
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[180px] text-center">
            {dateLabel}
          </span>
          <button
            onClick={() => setDateOffset((d) => d + 1)}
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

      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
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
                <th className="text-right px-5 py-2.5">Actual</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event, i) => (
                <tr
                  key={i}
                  className="border-b border-border/50 hover:bg-white/[0.02] transition-colors"
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
                  <td className="px-5 py-3 text-right font-semibold">
                    {event.actual || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
