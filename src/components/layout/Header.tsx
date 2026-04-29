"use client";

import { useEffect, useState } from "react";

function MarketStatus() {
  const [status, setStatus] = useState<string>("LOADING");
  const [dotClass, setDotClass] = useState("bg-[#64748b]");

  useEffect(() => {
    function update() {
      const now = new Date();
      const et = new Date(
        now.toLocaleString("en-US", { timeZone: "America/New_York" })
      );
      const h = et.getHours();
      const m = et.getMinutes();
      const day = et.getDay();
      const mins = h * 60 + m;

      // Equity sessions don't trade Saturdays. Asia reopens Sunday 18:00 ET.
      const isSaturday = day === 6;
      const isSundayBeforeAsia = day === 0 && mins < 18 * 60;
      if (isSaturday || isSundayBeforeAsia) {
        setStatus("WEEKEND");
        setDotClass("bg-[#64748b]");
        return;
      }

      // Global session windows in ET. Colors match the rest of the app's
      // session palette (Asia = purple, London = blue, NY = green).
      if (mins >= 9 * 60 + 30 && mins < 16 * 60) {
        setStatus("NEW YORK");
        setDotClass("bg-[#22c55e]");
      } else if (mins >= 8 * 60 && mins < 9 * 60 + 30) {
        setStatus("LONDON / NY");
        setDotClass("bg-[#f59e0b]");
      } else if (mins >= 3 * 60 && mins < 8 * 60) {
        setStatus("LONDON");
        setDotClass("bg-[#3b82f6]");
      } else if (mins >= 18 * 60 || mins < 2 * 60) {
        setStatus("ASIA");
        setDotClass("bg-[#a855f7]");
      } else if (mins >= 16 * 60 && mins < 18 * 60) {
        setStatus("AFTER HOURS");
        setDotClass("bg-[#f59e0b]");
      } else {
        // 02:00–03:00 ET: Asia closed, London not yet open.
        setStatus("MARKETS QUIET");
        setDotClass("bg-[#64748b]");
      }
    }
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm text-[#64748b]">
      <span
        className={`inline-block w-2 h-2 rounded-full ${dotClass} animate-pulse`}
      />
      {status}
    </div>
  );
}

export default function Header() {
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  return (
    <header className="flex items-center justify-between pb-5 mb-6 border-b border-[#1e293b]">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Dashboard</h1>
      </div>
      <div className="text-right">
        <MarketStatus />
        <div className="text-xs text-[#64748b] mt-1">{dateStr}</div>
      </div>
    </header>
  );
}
