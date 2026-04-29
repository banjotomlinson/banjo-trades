"use client";

import { useState, useEffect, useMemo } from "react";

const MARKET_CLOCKS = [
  { id: "ny", label: "New York", tz: "America/New_York", abbr: "ET" },
  { id: "london", label: "London", tz: "Europe/London", abbr: "GMT/BST" },
  { id: "tokyo", label: "Tokyo", tz: "Asia/Tokyo", abbr: "JST" },
  { id: "sydney", label: "Sydney", tz: "Australia/Sydney", abbr: "AEST" },
  { id: "dubai", label: "Dubai", tz: "Asia/Dubai", abbr: "GST" },
] as const;

const SESSION_CONFIG = [
  { key: "asia", name: "Asia", color: "#a855f7", startSec: 19 * 3600, endSec: 4 * 3600, overnight: true },
  { key: "london", name: "London", color: "#3b82f6", startSec: 3 * 3600, endSec: 12 * 3600, overnight: false },
  { key: "newyork", name: "New York", color: "#22c55e", startSec: 9 * 3600 + 30 * 60, endSec: 16 * 3600, overnight: false },
] as const;

function fmtTime(date: Date, tz: string): string {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false, timeZone: tz,
  });
}

function fmtCountdown(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  const s = secs % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function getSessionStatus(startSec: number, endSec: number, overnight: boolean, etDate: Date) {
  const nowSec = etDate.getHours() * 3600 + etDate.getMinutes() * 60 + etDate.getSeconds();
  const isOpen = overnight ? (nowSec >= startSec || nowSec < endSec) : (nowSec >= startSec && nowSec < endSec);
  let secsUntil: number;
  if (isOpen) {
    secsUntil = overnight ? (nowSec >= startSec ? 86400 - nowSec + endSec : endSec - nowSec) : endSec - nowSec;
  } else {
    secsUntil = nowSec < startSec ? startSec - nowSec : 86400 - nowSec + startSec;
  }
  return { isOpen, secsUntil };
}

export default function MarketClocks() {
  // "Your Time" is purely informational — always shows the user's actual
  // local timezone (auto-detected). The app-wide display timezone (used
  // by the calendar, countdown, etc.) lives on the Settings page.
  const [localTZ, setLocalTZ] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setLocalTZ(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const localLabel = useMemo(() => {
    if (!localTZ) return "";
    // Pretty form: "Brisbane (AEST)" — short city + abbreviation.
    const city = localTZ.split("/").pop()?.replace(/_/g, " ") ?? localTZ;
    try {
      const abbr = new Intl.DateTimeFormat("en-US", {
        timeZone: localTZ,
        timeZoneName: "short",
      })
        .formatToParts(now)
        .find((p) => p.type === "timeZoneName")?.value;
      return abbr ? `${city} · ${abbr}` : city;
    } catch {
      return city;
    }
  }, [localTZ, now]);

  const etNow = useMemo(() => {
    return new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  }, [now]);

  if (!localTZ) return null;

  return (
    <div className="space-y-3">
      {/* Clocks row */}
      <div className="flex items-stretch gap-3 overflow-x-auto">
        {/* Your time */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl px-5 py-4 min-w-[180px] flex flex-col">
          <div className="text-[10px] font-bold text-[#3b82f6] uppercase tracking-widest mb-2">Your Time</div>
          <div className="text-2xl font-black text-white tabular-nums tracking-tight leading-none">
            {fmtTime(now, localTZ)}
          </div>
          <div className="mt-3 text-[10px] text-[#64748b] font-semibold tracking-wide">
            {localLabel}
          </div>
        </div>

        {/* Market clocks */}
        {MARKET_CLOCKS.map((clock) => (
          <div
            key={clock.id}
            className="bg-[#111827] border border-[#1e293b] rounded-xl px-5 py-4 flex-1 min-w-[130px] text-center flex flex-col justify-center"
          >
            <div className="text-[10px] font-bold text-[#475569] uppercase tracking-widest mb-2">
              {clock.label}
            </div>
            <div className="text-lg font-bold text-[#e2e8f0] tabular-nums tracking-tight leading-none">
              {fmtTime(now, clock.tz)}
            </div>
            <div className="text-[10px] text-[#334155] font-semibold mt-2">
              {clock.abbr}
            </div>
          </div>
        ))}
      </div>

      {/* Session strip */}
      <div className="flex items-center gap-3">
        {SESSION_CONFIG.map((sess) => {
          const { isOpen, secsUntil } = getSessionStatus(sess.startSec, sess.endSec, sess.overnight, etNow);
          return (
            <div
              key={sess.key}
              className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                isOpen
                  ? "bg-[#111827] border-[#1e293b]"
                  : "bg-[#0c1016] border-[#151d2e]"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: isOpen ? sess.color : "#334155",
                  boxShadow: isOpen ? `0 0 8px ${sess.color}` : "none",
                }}
              />
              <span className="font-bold text-xs" style={{ color: sess.color }}>
                {sess.name}
              </span>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                style={
                  isOpen
                    ? { background: `${sess.color}20`, color: sess.color }
                    : { background: "rgba(71,85,105,0.15)", color: "#475569" }
                }
              >
                {isOpen ? "Open" : "Closed"}
              </span>
              <span className="text-[11px] text-[#475569] ml-auto tabular-nums">
                {isOpen ? "closes in " : "opens in "}
                {fmtCountdown(secsUntil)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
