"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

const TZ_OPTIONS = [
  { val: "America/New_York", label: "New York (ET)" },
  { val: "America/Chicago", label: "Chicago (CT)" },
  { val: "America/Denver", label: "Denver (MT)" },
  { val: "America/Los_Angeles", label: "Los Angeles (PT)" },
  { val: "Europe/London", label: "London (GMT/BST)" },
  { val: "Europe/Paris", label: "Paris (CET)" },
  { val: "Europe/Moscow", label: "Moscow (MSK)" },
  { val: "Asia/Dubai", label: "Dubai (GST)" },
  { val: "Asia/Kolkata", label: "Mumbai (IST)" },
  { val: "Asia/Singapore", label: "Singapore (SGT)" },
  { val: "Asia/Shanghai", label: "Shanghai (CST)" },
  { val: "Asia/Tokyo", label: "Tokyo (JST)" },
  { val: "Australia/Perth", label: "Perth (AWST)" },
  { val: "Australia/Sydney", label: "Sydney (AEST)" },
  { val: "Australia/Brisbane", label: "Brisbane (AEST)" },
  { val: "Pacific/Auckland", label: "Auckland (NZST)" },
];

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
  const [userTZ, setUserTZ] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const stored = localStorage.getItem("banjoTZ");
    setUserTZ(stored || Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleTZChange = useCallback((tz: string) => {
    setUserTZ(tz);
    localStorage.setItem("banjoTZ", tz);
  }, []);

  const tzOptions = useMemo(() => {
    if (!userTZ) return TZ_OPTIONS;
    const known = TZ_OPTIONS.some((o) => o.val === userTZ);
    if (known) return TZ_OPTIONS;
    return [{ val: userTZ, label: `Auto: ${userTZ.split("/").pop()}` }, ...TZ_OPTIONS];
  }, [userTZ]);

  const etNow = useMemo(() => {
    return new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  }, [now]);

  if (!userTZ) return null;

  return (
    <div className="space-y-3">
      {/* Clocks row */}
      <div className="flex items-stretch gap-3 overflow-x-auto">
        {/* Your time */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl px-5 py-4 min-w-[180px] flex flex-col">
          <div className="text-[10px] font-bold text-[#3b82f6] uppercase tracking-widest mb-2">Your Time</div>
          <div className="text-2xl font-black text-white tabular-nums tracking-tight leading-none">
            {fmtTime(now, userTZ)}
          </div>
          <select
            value={userTZ}
            onChange={(e) => handleTZChange(e.target.value)}
            className="mt-3 bg-[#0f172a] border border-[#1e293b] text-[#94a3b8] rounded-lg px-2.5 py-1.5 text-[11px] cursor-pointer focus:outline-none focus:border-[#3b82f6] transition-colors"
          >
            {tzOptions.map((o) => (
              <option key={o.val} value={o.val}>{o.label}</option>
            ))}
          </select>
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
