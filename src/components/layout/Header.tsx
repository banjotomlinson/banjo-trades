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

      if (day === 0 || day === 6) {
        setStatus("WEEKEND");
        setDotClass("bg-[#64748b]");
      } else if (mins >= 570 && mins < 960) {
        setStatus("MARKET OPEN");
        setDotClass("bg-[#22c55e]");
      } else if (mins >= 240 && mins < 570) {
        setStatus("PRE-MARKET");
        setDotClass("bg-[#f59e0b]");
      } else if (mins >= 960 && mins < 1200) {
        setStatus("AFTER HOURS");
        setDotClass("bg-[#f59e0b]");
      } else {
        setStatus("CLOSED");
        setDotClass("bg-[#ef4444]");
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
