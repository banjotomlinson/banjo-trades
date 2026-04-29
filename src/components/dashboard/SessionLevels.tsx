"use client";

import { useEffect, useState, useCallback } from "react";
import {
  useTradingMode,
  type TradingMode,
} from "@/components/providers/TradingModeProvider";

// ── Types ────────────────────────────────────────────────────────
interface SessionHL {
  high: number | null;
  low: number | null;
  range: number | null;
}

interface SessionData {
  primary: SessionHL;
  secondary: SessionHL;
  status: "live" | "upcoming" | "closed";
}

type SessionKey = "asia" | "london" | "newyork";

interface YahooCandles {
  timestamps: number[];
  highs: (number | null)[];
  lows: (number | null)[];
  opens: (number | null)[];
  closes: (number | null)[];
}

interface Leg {
  yahoo: string;
  label: string;
  decimals: number;
}

interface InstrumentPair {
  primary: Leg;
  secondary: Leg;
}

// ── Per-mode instrument pair ─────────────────────────────────────
const MODE_INSTRUMENTS: Record<TradingMode, InstrumentPair> = {
  all: {
    primary: { yahoo: "NQ=F", label: "NAS", decimals: 2 },
    secondary: { yahoo: "ES=F", label: "SPX", decimals: 2 },
  },
  futures: {
    primary: { yahoo: "NQ=F", label: "NAS", decimals: 2 },
    secondary: { yahoo: "ES=F", label: "SPX", decimals: 2 },
  },
  commodities: {
    primary: { yahoo: "GC=F", label: "Gold", decimals: 2 },
    secondary: { yahoo: "CL=F", label: "Oil", decimals: 2 },
  },
  forex: {
    primary: { yahoo: "EURUSD=X", label: "EUR/USD", decimals: 5 },
    secondary: { yahoo: "GBPUSD=X", label: "GBP/USD", decimals: 5 },
  },
  crypto: {
    primary: { yahoo: "BTC-USD", label: "BTC", decimals: 2 },
    secondary: { yahoo: "ETH-USD", label: "ETH", decimals: 2 },
  },
};

// ── Constants ────────────────────────────────────────────────────
const SESSIONS: Record<SessionKey, {
  startH: number;
  startM: number;
  endH: number;
  endM: number;
  overnight: boolean;
  label: string;
  timeRange: string;
  dotColor: string;
  headingColor: string;
  toggleActiveColor: string;
}> = {
  asia: {
    startH: 18, startM: 0, endH: 2, endM: 0,
    overnight: true, label: "Asia",
    timeRange: "6:00 PM — 2:00 AM ET",
    dotColor: "bg-purple-500",
    headingColor: "text-purple-500",
    toggleActiveColor: "bg-purple-500",
  },
  london: {
    startH: 3, startM: 0, endH: 8, endM: 0,
    overnight: false, label: "London",
    timeRange: "3:00 AM — 8:00 AM ET",
    dotColor: "bg-blue-500",
    headingColor: "text-blue-500",
    toggleActiveColor: "bg-blue-500",
  },
  newyork: {
    startH: 9, startM: 30, endH: 16, endM: 0,
    overnight: false, label: "New York",
    timeRange: "9:30 AM — 4:00 PM ET",
    dotColor: "bg-green-500",
    headingColor: "text-green-500",
    toggleActiveColor: "bg-green-500",
  },
};

const SESSION_POLL = 120_000; // 2 minutes

const STATUS_STYLES: Record<string, string> = {
  live: "bg-green-500/15 text-green-500",
  upcoming: "bg-blue-500/15 text-blue-500",
  closed: "bg-slate-600/15 text-slate-600",
};

// ── Helpers ──────────────────────────────────────────────────────
function getETNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
}

function getSessionStatus(session: SessionKey, targetDate: Date): "live" | "upcoming" | "closed" {
  const et = getETNow();
  const today = new Date(et.getFullYear(), et.getMonth(), et.getDate());
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  if (target < today) return "closed";

  if (target.getTime() === today.getTime()) {
    const h = et.getHours();
    const m = et.getMinutes();
    const day = et.getDay();
    if (day === 0 || day === 6) return "closed";

    const nowMins = h * 60 + m;
    const s = SESSIONS[session];
    const startMins = s.startH * 60 + s.startM;
    const endMins = s.endH * 60 + s.endM;

    if (s.overnight) {
      if (nowMins >= startMins || nowMins < endMins) return "live";
      return "closed";
    } else {
      if (nowMins >= startMins && nowMins < endMins) return "live";
      if (nowMins < startMins) return "upcoming";
      return "closed";
    }
  }

  return "closed";
}

async function fetchYahoo(symbol: string): Promise<YahooCandles> {
  const url = `/api/yahoo?symbol=${encodeURIComponent(symbol)}&interval=5m&range=5d`;
  const res = await fetch(url);
  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result?.timestamp)
    return { timestamps: [], highs: [], lows: [], opens: [], closes: [] };
  return {
    timestamps: result.timestamp,
    highs: result.indicators.quote[0].high,
    lows: result.indicators.quote[0].low,
    opens: result.indicators.quote[0].open,
    closes: result.indicators.quote[0].close,
  };
}

function computeSessionHL(
  data: YahooCandles,
  startUtc: number,
  endUtc: number
): SessionHL {
  if (!data.timestamps.length) return { high: null, low: null, range: null };
  let high = -Infinity;
  let low = Infinity;
  let count = 0;
  for (let i = 0; i < data.timestamps.length; i++) {
    const ts = data.timestamps[i];
    if (ts >= startUtc && ts < endUtc && data.highs[i] != null && data.lows[i] != null) {
      if (data.highs[i]! > high) high = data.highs[i]!;
      if (data.lows[i]! < low) low = data.lows[i]!;
      count++;
    }
  }
  if (count === 0) return { high: null, low: null, range: null };
  return { high, low, range: high - low };
}

function computePivotPoints(high: number, low: number, close: number) {
  const pivot = (high + low + close) / 3;
  return {
    r2: pivot + (high - low),
    r1: 2 * pivot - low,
    pivot,
    s1: 2 * pivot - high,
    s2: pivot - (high - low),
  };
}

function fmt(n: number | null, decimals = 2): string {
  if (n == null) return "--";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ── Sub-components ───────────────────────────────────────────────
function LevelRow({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string;
  colorClass: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#1e293b] last:border-b-0">
      <span className="text-[13px] text-[#94a3b8]">{label}</span>
      <span className={`text-[15px] font-bold tabular-nums ${colorClass}`}>{value}</span>
    </div>
  );
}

function SessionCard({
  sessionKey,
  sessionData,
  visible,
  instruments,
}: {
  sessionKey: SessionKey;
  sessionData: SessionData | null;
  visible: boolean;
  instruments: InstrumentPair;
}) {
  const cfg = SESSIONS[sessionKey];
  if (!visible) return null;

  const data = sessionData;
  const status = data?.status ?? "closed";
  const p = instruments.primary;
  const s = instruments.secondary;

  // Compute pivot points from primary instrument data if available
  const pivots =
    data?.primary.high != null && data?.primary.low != null
      ? computePivotPoints(
          data.primary.high,
          data.primary.low,
          (data.primary.high + data.primary.low) / 2
        )
      : null;

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 relative">
      <h3 className={`text-sm font-bold mb-0.5 ${cfg.headingColor}`}>{cfg.label} Session</h3>
      <div className="text-[11px] text-[#475569] mb-3">{cfg.timeRange}</div>

      {/* Primary instrument levels */}
      <LevelRow label={`${p.label} High`} value={fmt(data?.primary.high ?? null, p.decimals)} colorClass="text-red-500" />
      <LevelRow label={`${p.label} Low`} value={fmt(data?.primary.low ?? null, p.decimals)} colorClass="text-green-500" />
      <LevelRow label={`${p.label} Range`} value={fmt(data?.primary.range ?? null, p.decimals)} colorClass="text-amber-500" />

      {/* Secondary instrument levels */}
      <LevelRow label={`${s.label} High`} value={fmt(data?.secondary.high ?? null, s.decimals)} colorClass="text-red-500" />
      <LevelRow label={`${s.label} Low`} value={fmt(data?.secondary.low ?? null, s.decimals)} colorClass="text-green-500" />
      <LevelRow label={`${s.label} Range`} value={fmt(data?.secondary.range ?? null, s.decimals)} colorClass="text-amber-500" />

      {/* Pivot points (primary-derived) */}
      {pivots && (
        <div className="mt-3 pt-2 border-t border-[#1e293b]">
          <div className="text-[11px] text-[#64748b] font-semibold uppercase mb-1.5">
            Pivot Points ({p.label})
          </div>
          <LevelRow label="Resistance 2" value={fmt(pivots.r2, p.decimals)} colorClass="text-red-400" />
          <LevelRow label="Resistance 1" value={fmt(pivots.r1, p.decimals)} colorClass="text-red-400" />
          <LevelRow label="Pivot" value={fmt(pivots.pivot, p.decimals)} colorClass="text-slate-300" />
          <LevelRow label="Support 1" value={fmt(pivots.s1, p.decimals)} colorClass="text-green-400" />
          <LevelRow label="Support 2" value={fmt(pivots.s2, p.decimals)} colorClass="text-green-400" />
        </div>
      )}

      {/* Status badge */}
      <span
        className={`absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_STYLES[status]}`}
      >
        {status === "live" ? "LIVE" : status === "upcoming" ? "UPCOMING" : "CLOSED"}
      </span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 animate-pulse"
        >
          <div className="h-4 w-24 bg-[#1e293b] rounded mb-1" />
          <div className="h-2.5 w-36 bg-[#1e293b] rounded mb-4" />
          {[0, 1, 2, 3, 4, 5].map((j) => (
            <div key={j} className="flex justify-between py-1.5">
              <div className="h-3 w-16 bg-[#1e293b] rounded" />
              <div className="h-3 w-20 bg-[#1e293b] rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function SessionLevels() {
  const { mode, modeLabel } = useTradingMode();
  const instruments = MODE_INSTRUMENTS[mode];

  const [sessionDataMap, setSessionDataMap] = useState<Record<SessionKey, SessionData | null>>({
    asia: null,
    london: null,
    newyork: null,
  });
  const [loading, setLoading] = useState(true);
  const [dayOffset, setDayOffset] = useState(0);
  const [visibility, setVisibility] = useState<Record<SessionKey, boolean>>({
    asia: true,
    london: true,
    newyork: true,
  });

  const getDayLabel = useCallback(() => {
    if (dayOffset === 0) return "Today";
    const d = getETNow();
    d.setDate(d.getDate() + dayOffset);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }, [dayOffset]);

  const primaryYahoo = instruments.primary.yahoo;
  const secondaryYahoo = instruments.secondary.yahoo;

  const loadLevels = useCallback(async () => {
    setLoading(true);
    const et = getETNow();
    const targetDate = new Date(et);
    targetDate.setDate(targetDate.getDate() + dayOffset);

    const etOffsetMs = new Date().getTime() - getETNow().getTime();

    try {
      const [primaryData, secondaryData] = await Promise.all([
        fetchYahoo(primaryYahoo),
        fetchYahoo(secondaryYahoo),
      ]);

      const newMap: Record<SessionKey, SessionData> = {
        asia: { primary: { high: null, low: null, range: null }, secondary: { high: null, low: null, range: null }, status: "closed" },
        london: { primary: { high: null, low: null, range: null }, secondary: { high: null, low: null, range: null }, status: "closed" },
        newyork: { primary: { high: null, low: null, range: null }, secondary: { high: null, low: null, range: null }, status: "closed" },
      };

      for (const key of Object.keys(SESSIONS) as SessionKey[]) {
        const sess = SESSIONS[key];
        const status = getSessionStatus(key, targetDate);

        let sessionStart: Date;
        let sessionEnd: Date;

        if (sess.overnight) {
          const base = new Date(targetDate);
          base.setDate(base.getDate() - 1);
          sessionStart = new Date(base.getFullYear(), base.getMonth(), base.getDate(), sess.startH, sess.startM);
          sessionEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), sess.endH, sess.endM);
        } else {
          sessionStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), sess.startH, sess.startM);
          sessionEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), sess.endH, sess.endM);
        }

        const startUtc = Math.floor((sessionStart.getTime() + etOffsetMs) / 1000);
        const endUtc = Math.floor((sessionEnd.getTime() + etOffsetMs) / 1000);

        const primaryHL = computeSessionHL(primaryData, startUtc, endUtc);
        const secondaryHL = computeSessionHL(secondaryData, startUtc, endUtc);

        newMap[key] = { primary: primaryHL, secondary: secondaryHL, status };
      }

      setSessionDataMap(newMap);
    } catch (err) {
      console.error("Session levels error:", err);
    } finally {
      setLoading(false);
    }
  }, [dayOffset, primaryYahoo, secondaryYahoo]);

  // Reset cached data when the instrument pair changes so stale numbers don't flash
  useEffect(() => {
    setSessionDataMap({ asia: null, london: null, newyork: null });
  }, [primaryYahoo, secondaryYahoo]);

  // Load on mount + when dayOffset / instruments change
  useEffect(() => {
    loadLevels();
  }, [loadLevels]);

  // Poll every 2 minutes
  useEffect(() => {
    const interval = setInterval(loadLevels, SESSION_POLL);
    return () => clearInterval(interval);
  }, [loadLevels]);

  const toggleVisibility = (key: SessionKey) => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const shiftDay = (delta: number) => {
    setDayOffset((prev) => {
      const next = prev + delta;
      return next > 0 ? 0 : next; // can't go into the future
    });
  };

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
      {/* Toggle bar */}
      <div className="flex items-center gap-2 flex-wrap bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-2.5 mb-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] mr-2">
          Session Levels
          <span className="ml-2 text-[#94a3b8] normal-case tracking-normal">
            {modeLabel} &middot; {instruments.primary.label} / {instruments.secondary.label}
          </span>
        </span>

        {(Object.keys(SESSIONS) as SessionKey[]).map((key) => (
          <button
            key={key}
            onClick={() => toggleVisibility(key)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition-all ${
              visibility[key]
                ? `${SESSIONS[key].toggleActiveColor} text-white border-transparent`
                : "bg-transparent text-[#64748b] border-[#1e293b] hover:border-[#64748b] hover:text-[#e2e8f0]"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${SESSIONS[key].dotColor}`} />
            {SESSIONS[key].label}
          </button>
        ))}

        <span className="flex-1" />

        {/* Day navigation */}
        <button
          onClick={() => shiftDay(-1)}
          className="bg-[#111827] border border-[#1e293b] rounded-md px-2.5 py-1 text-xs text-[#e2e8f0] hover:border-[#64748b] transition-colors"
        >
          &larr;
        </button>
        <span className="text-[13px] font-semibold text-[#e2e8f0] min-w-[140px] text-center mx-2">
          {getDayLabel()}
        </span>
        <button
          onClick={() => shiftDay(1)}
          className="bg-[#111827] border border-[#1e293b] rounded-md px-2.5 py-1 text-xs text-[#e2e8f0] hover:border-[#64748b] transition-colors"
          style={{ opacity: dayOffset >= 0 ? 0.3 : 1, pointerEvents: dayOffset >= 0 ? "none" : "auto" }}
        >
          &rarr;
        </button>
        <button
          onClick={() => setDayOffset(0)}
          className="bg-[#111827] border border-[#1e293b] rounded-md px-3 py-1 text-xs font-semibold text-[#e2e8f0] hover:border-[#64748b] transition-colors ml-2"
        >
          Today
        </button>
      </div>

      {/* Session cards grid */}
      {loading && !sessionDataMap.asia ? (
        <LoadingSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(Object.keys(SESSIONS) as SessionKey[]).map((key) => (
            <SessionCard
              key={key}
              sessionKey={key}
              sessionData={sessionDataMap[key]}
              visible={visibility[key]}
              instruments={instruments}
            />
          ))}
        </div>
      )}
    </div>
  );
}
