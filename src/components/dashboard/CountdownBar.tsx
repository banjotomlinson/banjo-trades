"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface CalendarEvent {
  title: string;
  date: Date;
  impact: string;
  currency?: string;
}

interface CountdownBarProps {
  events?: CalendarEvent[];
  apiEndpoint?: string;
  currency?: string;
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

function formatEventTime(date: Date): string {
  return (
    date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/New_York",
    }) + " ET"
  );
}

export default function CountdownBar({
  events: propEvents,
  apiEndpoint = "/api/calendar",
  currency = "ALL",
}: CountdownBarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(propEvents ?? []);
  const [countdown, setCountdown] = useState("--:--:--");
  const [eventName, setEventName] = useState("Loading...");
  const [eventTime, setEventTime] = useState("");
  const [isImminent, setIsImminent] = useState(false);
  const rafRef = useRef<number | null>(null);

  // Fetch events from API if none provided via props
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
          (e: { title: string; date: string; impact: string; currency?: string }) => ({
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
          (currency === "ALL" || !e.currency || e.currency === currency)
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (upcoming.length === 0) {
      setEventName("No upcoming high-impact events");
      setCountdown("\u2014");
      setEventTime("");
      setIsImminent(false);
      return;
    }

    const next = upcoming[0];
    setEventName(next.title);
    setEventTime(formatEventTime(next.date));

    const diff = next.date.getTime() - Date.now();
    if (diff <= 0) {
      setCountdown("NOW");
      setIsImminent(true);
      return;
    }

    setCountdown(formatCountdown(diff));
    setIsImminent(diff < 300000); // 5 minutes
    rafRef.current = requestAnimationFrame(tick);
  }, [events, currency]);

  useEffect(() => {
    tick();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  return (
    <div
      className="flex items-center justify-between rounded-xl border border-[#1e293b] bg-[#111827] px-6 py-5"
    >
      <div>
        <div className="text-[13px] font-semibold uppercase tracking-wide text-[#64748b]">
          Next High-Impact Event
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
