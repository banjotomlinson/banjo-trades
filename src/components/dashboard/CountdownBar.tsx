"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useCalendarFilter } from "@/components/providers/CalendarFilterProvider";
import { useTimezone } from "@/lib/useTimezone";

interface CalendarEvent {
  title: string;
  date: Date;
  impact: string;
  country?: string;
}

interface CountdownBarProps {
  events?: CalendarEvent[];
  apiEndpoint?: string;
}

function formatCountdown(diff: number): string {
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  if (d > 0) return `${d}d ${h}h ${String(m).padStart(2, "0")}m`;
  if (h > 0)
    return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function formatEventTime(date: Date, tz: string): string {
  // Render in the user's chosen zone with the auto-resolved abbreviation
  // (PT, ET, AEST, BST, etc.) so it's always self-describing.
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
    timeZoneName: "short",
  });
}

export default function CountdownBar({
  events: propEvents,
  apiEndpoint = "/api/calendar",
}: CountdownBarProps) {
  const { matches, selection } = useCalendarFilter();
  const tz = useTimezone();
  const filterLabel =
    selection === "all"
      ? "All currencies"
      : selection.length === 1
        ? selection[0]
        : selection.join(" · ");
  const [events, setEvents] = useState<CalendarEvent[]>(propEvents ?? []);
  const [countdown, setCountdown] = useState("--:--:--");
  const [eventName, setEventName] = useState("Loading...");
  const [eventTime, setEventTime] = useState("");
  const [isImminent, setIsImminent] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (propEvents) {
      setEvents(propEvents);
      return;
    }

    let cancelled = false;
    async function fetchEvents() {
      try {
        const res = await fetch(apiEndpoint);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const parsed = (data.events ?? data ?? []).map(
          (e: { title: string; date: string; impact: string; country?: string }) => ({
            ...e,
            date: new Date(e.date),
          })
        );
        setEvents(parsed);
      } catch {
        // silently fail, keep showing loading state
      }
    }
    fetchEvents();
    return () => {
      cancelled = true;
    };
  }, [propEvents, apiEndpoint]);

  const tick = useCallback(() => {
    const now = new Date();
    const upcoming = events
      .filter(
        (e) =>
          e.impact === "high" &&
          e.date > now &&
          (!e.country || matches(e.country))
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (upcoming.length === 0) {
      setEventName("Nothing soon");
      setCountdown("—");
      setEventTime("");
      setIsImminent(false);
      return;
    }

    const next = upcoming[0];
    setEventName(next.title);
    setEventTime(formatEventTime(next.date, tz));

    const diff = next.date.getTime() - Date.now();
    if (diff <= 0) {
      setCountdown("NOW");
      setIsImminent(true);
      return;
    }

    setCountdown(formatCountdown(diff));
    setIsImminent(diff < 300000); // 5 minutes
    rafRef.current = requestAnimationFrame(tick);
  }, [events, matches, tz]);

  useEffect(() => {
    tick();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  return (
    <div className="flex items-center justify-between rounded-xl border border-[#1e293b] bg-[#111827] px-6 py-5">
      <div>
        <div className="text-[13px] font-semibold uppercase tracking-wide text-[#64748b]">
          Next High-Impact Event
          <span className="ml-2 text-[10px] font-medium normal-case tracking-normal text-[#475569]">
            · {filterLabel}
          </span>
        </div>
        <div className="mt-1 text-lg font-bold text-white">{eventName}</div>
      </div>
      <div className="text-right">
        <div
          className={`text-[28px] font-bold tabular-nums ${
            isImminent ? "text-red-600" : "text-blue-500"
          }`}
        >
          {countdown}
        </div>
        {eventTime && (
          <div className="text-xs text-[#64748b]">{eventTime}</div>
        )}
      </div>
    </div>
  );
}
