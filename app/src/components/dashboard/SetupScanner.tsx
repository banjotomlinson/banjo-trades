"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ──

type Direction = "LONG" | "SHORT";
type SetupStatus = "active" | "watch" | "pending";
type StructureBias = "bullish" | "bearish" | "neutral";
type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

type ICTTag =
  | "fvg"
  | "ob"
  | "eq"
  | "bsl"
  | "ssl"
  | "liquidity"
  | "structure"
  | "choch"
  | "bos"
  | "mss"
  | "displacement"
  | "turtle"
  | "inducement"
  | "breaker"
  | "mitigation"
  | "pd"
  | "eql"
  | "eqh"
  | "void";

interface HTFContext {
  dailyBias: StructureBias;
  h1Structure: StructureBias;
  h1Context: string;
  dailyDraw: string;
}

interface TradeSetup {
  instrumentName: string;
  direction: Direction;
  timeframe: string;
  status: SetupStatus;
  isMTF: boolean;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  takeProfit: number;
  equilibrium: number;
  riskReward: number;
  confidencePct: number;
  confidenceLevel: ConfidenceLevel;
  confidenceReason: string;
  tags: ICTTag[];
  structure: StructureBias;
  htf?: HTFContext;
}

interface GeneratedSetup {
  direction: "LONG" | "SHORT";
  instrumentName: string;
  timeframe: string;
  eMid: number;
  eHigh: number;
  eLow: number;
  sl: number;
  tp: number;
  equil: number;
  rr: number;
  tags: string[];
  structure: "bullish" | "bearish" | "neutral";
  status: "active" | "watch" | "pending";
  score: number;
  pdZone: { zone: string; pct: number } | null;
}

// ── Instrument display names ──

const SYMBOL_NAMES: Record<string, string> = {
  "NQ%3DF": "NASDAQ (NAS100)",
  "ES%3DF": "S&P 500 (SPX)",
  "EURUSD%3DX": "EUR/USD",
  "GBPUSD%3DX": "GBP/USD",
  "BTC-USD": "Bitcoin (BTC)",
  "GC%3DF": "Gold (XAU)",
};

const SYMBOLS = Object.keys(SYMBOL_NAMES);

// ── Tag colour map (exact match to source CSS lines 1259-1277) ──

const TAG_STYLES: Record<ICTTag, { bg: string; color: string }> = {
  fvg:          { bg: "rgba(59,130,246,0.12)",  color: "#60a5fa" },
  ob:           { bg: "rgba(168,85,247,0.12)",  color: "#c084fc" },
  eq:           { bg: "rgba(245,158,11,0.12)",  color: "#fbbf24" },
  bsl:          { bg: "rgba(34,197,94,0.12)",   color: "#4ade80" },
  ssl:          { bg: "rgba(239,68,68,0.12)",   color: "#f87171" },
  liquidity:    { bg: "rgba(239,68,68,0.12)",   color: "#f87171" },
  structure:    { bg: "rgba(34,197,94,0.12)",   color: "#4ade80" },
  choch:        { bg: "rgba(251,191,36,0.15)",  color: "#fcd34d" },
  bos:          { bg: "rgba(16,185,129,0.12)",  color: "#6ee7b7" },
  mss:          { bg: "rgba(6,182,212,0.12)",   color: "#67e8f9" },
  displacement: { bg: "rgba(239,68,68,0.15)",   color: "#fca5a5" },
  turtle:       { bg: "rgba(245,158,11,0.15)",  color: "#fcd34d" },
  inducement:   { bg: "rgba(249,115,22,0.12)",  color: "#fdba74" },
  breaker:      { bg: "rgba(239,68,68,0.12)",   color: "#f87171" },
  mitigation:   { bg: "rgba(99,102,241,0.12)",  color: "#a5b4fc" },
  pd:           { bg: "rgba(20,184,166,0.12)",   color: "#5eead4" },
  eql:          { bg: "rgba(239,68,68,0.12)",   color: "#f87171" },
  eqh:          { bg: "rgba(34,197,94,0.12)",   color: "#4ade80" },
  void:         { bg: "rgba(148,163,184,0.10)", color: "#94a3b8" },
};

// ── Tag display names (matches monolith tagMap) ──

function getTagLabel(tag: ICTTag, direction: Direction, isMTF: boolean): string {
  const map: Record<ICTTag, string> = {
    fvg: "FVG",
    ob: "Order Block",
    eq: isMTF ? "1H Zone" : "Equilibrium",
    bsl: "BSL Target",
    ssl: "SSL Target",
    liquidity: direction === "LONG" ? "BSL Target" : "SSL Target",
    structure: direction === "LONG" ? "Bullish BOS" : "Bearish BOS",
    choch: direction === "LONG" ? "Bullish CHoCH" : "Bearish CHoCH",
    bos: direction === "LONG" ? "BOS \u2191" : "BOS \u2193",
    mss: direction === "LONG" ? "MSS \u2191" : "MSS \u2193",
    displacement: "Displacement",
    turtle: "Turtle Soup",
    inducement: "Inducement",
    breaker: "Breaker Block",
    mitigation: "Mitigation Block",
    pd: "P/D Zone",
    eql: "Equal Lows (SSL)",
    eqh: "Equal Highs (BSL)",
    void: "Liq. Void",
  };
  return map[tag];
}

// ── Structure pill colours ──

const STRUCTURE_STYLES: Record<StructureBias, { bg: string; color: string }> = {
  bullish: { bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
  bearish: { bg: "rgba(239,68,68,0.12)", color: "#f87171" },
  neutral: { bg: "rgba(71,85,105,0.12)", color: "#64748b" },
};

// ── Status badge colours ──

const STATUS_STYLES: Record<SetupStatus, { bg: string; color: string }> = {
  active:  { bg: "rgba(34,197,94,0.12)",  color: "#22c55e" },
  watch:   { bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
  pending: { bg: "rgba(71,85,105,0.12)",  color: "#475569" },
};

// ── Confidence colours ──

const CONF_STYLES: Record<ConfidenceLevel, { bg: string; color: string }> = {
  HIGH:   { bg: "rgba(34,197,94,0.15)",  color: "#22c55e" },
  MEDIUM: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
  LOW:    { bg: "rgba(239,68,68,0.15)",  color: "#ef4444" },
};

function confBarColor(level: ConfidenceLevel): string {
  if (level === "HIGH") return "#22c55e";
  if (level === "MEDIUM") return "#f59e0b";
  return "#ef4444";
}

// ── Price formatter ──

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(5);
}

// ── Confidence reason generator ──

const TAG_LABEL_SHORT: Record<string, string> = {
  fvg: "FVG",
  ob: "Order Block",
  choch: "CHoCH",
  bos: "BOS",
  mss: "MSS",
  bsl: "buy-side liquidity",
  ssl: "sell-side liquidity",
  displacement: "displacement",
  turtle: "Turtle Soup",
  inducement: "inducement",
  breaker: "Breaker Block",
  mitigation: "Mitigation Block",
  pd: "P/D zone",
  eq: "equilibrium",
  eql: "equal lows",
  eqh: "equal highs",
  liquidity: "liquidity",
  structure: "structure shift",
  void: "liquidity void",
};

function generateConfidenceReason(tags: string[], direction: Direction): string {
  if (tags.length === 0) return "Minimal confluence detected.";

  const isLong = direction === "LONG";
  const parts: string[] = [];

  // Entry confluence (FVG, OB, Breaker, Mitigation)
  const entryTags = tags.filter((t) => ["fvg", "ob", "breaker", "mitigation"].includes(t));
  if (entryTags.length > 1) {
    parts.push(entryTags.map((t) => TAG_LABEL_SHORT[t] || t.toUpperCase()).join(" + ") + " confluence");
  } else if (entryTags.length === 1) {
    parts.push(TAG_LABEL_SHORT[entryTags[0]] + " identified");
  }

  // P/D zone context
  if (tags.includes("pd")) {
    parts.push(isLong ? "in discount" : "in premium");
  }

  // Structure confirmation
  if (tags.includes("choch")) {
    parts.push(isLong ? "bullish CHoCH confirmed" : "bearish CHoCH confirmed");
  } else if (tags.includes("bos")) {
    parts.push(isLong ? "bullish BOS confirmed" : "bearish BOS confirmed");
  } else if (tags.includes("mss")) {
    parts.push(isLong ? "MSS to the upside" : "MSS to the downside");
  }

  // Displacement
  if (tags.includes("displacement")) {
    parts.push("displacement present");
  }

  // Liquidity draw
  if (tags.includes("bsl")) {
    parts.push("draw on buy-side liquidity above");
  }
  if (tags.includes("ssl")) {
    parts.push("targeting sell-side liquidity below");
  }
  if (tags.includes("eqh")) {
    parts.push("equal highs acting as BSL target");
  }
  if (tags.includes("eql")) {
    parts.push("equal lows acting as SSL target");
  }

  // Other modifiers
  if (tags.includes("inducement")) {
    parts.push("inducement swept");
  }
  if (tags.includes("turtle")) {
    parts.push("Turtle Soup pattern");
  }
  if (tags.includes("void")) {
    parts.push("liquidity void to fill");
  }

  if (parts.length === 0) {
    return "Setup detected with minimal ICT confluence.";
  }

  // Join with periods and commas for readability
  const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  if (parts.length === 1) return first + ".";
  if (parts.length === 2) return first + ", " + parts[1] + ".";

  // 3+ parts: first sentence, then rest
  return first + ". " + parts.slice(1).map((p, i) => i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p).join(", ") + ".";
}

// ── Map API setup to card format ──

function mapSetupToCard(setup: GeneratedSetup, symbol: string): TradeSetup {
  const score = setup.score ?? 0;
  const confidencePct = Math.min(95, Math.max(15, score * 5 + 20));
  const confidenceLevel: ConfidenceLevel = score >= 12 ? "HIGH" : score >= 7 ? "MEDIUM" : "LOW";
  const validTags = setup.tags.filter((t): t is ICTTag => t in TAG_STYLES);

  return {
    instrumentName: SYMBOL_NAMES[symbol] ?? setup.instrumentName,
    direction: setup.direction,
    timeframe: setup.timeframe,
    status: setup.status,
    isMTF: false,
    entryLow: setup.eLow,
    entryHigh: setup.eHigh,
    stopLoss: setup.sl,
    takeProfit: setup.tp,
    equilibrium: setup.equil,
    riskReward: setup.rr,
    confidencePct,
    confidenceLevel,
    confidenceReason: generateConfidenceReason(setup.tags, setup.direction),
    tags: validTags,
    structure: setup.structure,
  };
}

// ── Sub-components ──

function StructurePill({ bias, small }: { bias: StructureBias; small?: boolean }) {
  const s = STRUCTURE_STYLES[bias];
  return (
    <span
      className={`inline-block rounded font-bold uppercase ${small ? "px-[7px] py-px text-[9px]" : "px-[7px] py-px text-[10px]"}`}
      style={{ background: s.bg, color: s.color }}
    >
      {bias}
    </span>
  );
}

function SetupCard({ setup }: { setup: TradeSetup }) {
  const isLong = setup.direction === "LONG";
  const rrClass =
    setup.riskReward >= 3 ? "#22c55e" : setup.riskReward >= 2 ? "#f59e0b" : "#ef4444";
  const dirStyle = isLong
    ? { background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }
    : { background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" };
  const statusStyle = STATUS_STYLES[setup.status];
  const confStyle = CONF_STYLES[setup.confidenceLevel];

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] overflow-hidden hover:border-[#334155] transition-colors">
      {/* Header */}
      <div className="flex items-center flex-wrap gap-[7px] px-3.5 py-[11px] border-b border-[#1e293b]">
        <span
          className="rounded-[5px] px-[9px] py-[3px] text-[11px] font-extrabold uppercase tracking-wide"
          style={dirStyle}
        >
          {setup.direction}
        </span>
        <span className="flex-1 text-sm font-bold text-[#f1f5f9]">
          {setup.instrumentName}
        </span>
        <span className="rounded bg-[#1e293b] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#475569]">
          {setup.timeframe}
        </span>
        {setup.isMTF && (
          <span
            className="inline-flex items-center gap-1 rounded px-[7px] py-0.5 text-[9px] font-extrabold uppercase tracking-wide"
            style={{
              background: "rgba(168,85,247,0.12)",
              color: "#c084fc",
              border: "1px solid rgba(168,85,247,0.25)",
            }}
          >
            MTF
          </span>
        )}
        <span
          className="rounded px-[7px] py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{ background: statusStyle.bg, color: statusStyle.color }}
        >
          {setup.status}
        </span>
      </div>

      {/* Body */}
      <div className="px-3.5 py-3">
        {/* HTF Context (only for MTF setups) */}
        {setup.isMTF && setup.htf && (
          <div className="mb-2 rounded-[7px] border border-[#1e293b] p-[8px_10px] text-[11px]" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="flex items-center justify-between py-[3px]">
              <span className="font-semibold text-[#475569] whitespace-nowrap">Daily Bias</span>
              <StructurePill bias={setup.htf.dailyBias} small />
            </div>
            <div className="flex items-center justify-between py-[3px]">
              <span className="font-semibold text-[#475569] whitespace-nowrap">1H Structure</span>
              <StructurePill bias={setup.htf.h1Structure} small />
            </div>
            <div className="flex items-center justify-between py-[3px]">
              <span className="font-semibold text-[#475569] whitespace-nowrap">1H Context</span>
              <span className="text-[11px] text-[#94a3b8] text-right">{setup.htf.h1Context}</span>
            </div>
            <div className="flex items-center justify-between py-[3px]">
              <span className="font-semibold text-[#475569] whitespace-nowrap">Daily Draw</span>
              <span className="text-[11px] text-right" style={{ color: isLong ? "#22c55e" : "#ef4444" }}>
                {setup.htf.dailyDraw}
              </span>
            </div>
          </div>
        )}

        {/* Price rows */}
        <div className="flex justify-between items-center py-[5px] border-b border-[#1a2235] text-xs">
          <span className="font-semibold text-[#64748b]">Entry Zone</span>
          <span className="font-bold tabular-nums text-blue-500">
            {fmtPrice(setup.entryLow)} &ndash; {fmtPrice(setup.entryHigh)}
          </span>
        </div>
        <div className="flex justify-between items-center py-[5px] border-b border-[#1a2235] text-xs">
          <span className="font-semibold text-[#64748b]">
            Stop Loss
            {setup.isMTF && (
              <span className="text-[10px] text-[#475569] ml-1">(tight)</span>
            )}
          </span>
          <span className="font-bold tabular-nums text-red-500">{fmtPrice(setup.stopLoss)}</span>
        </div>
        <div className="flex justify-between items-center py-[5px] border-b border-[#1a2235] text-xs">
          <span className="font-semibold text-[#64748b]">
            Take Profit{" "}
            <span className="text-[10px] text-[#475569]">
              {setup.isMTF ? "(Daily DoL)" : "(Draw on Liq.)"}
            </span>
          </span>
          <span className="font-bold tabular-nums text-green-500">{fmtPrice(setup.takeProfit)}</span>
        </div>
        <div className="flex justify-between items-center py-[5px] text-xs">
          <span className="font-semibold text-[#64748b]">Equilibrium (50%)</span>
          <span className="font-bold tabular-nums text-amber-500">{fmtPrice(setup.equilibrium)}</span>
        </div>

        {/* Risk:Reward */}
        <div
          className="mt-2.5 flex items-center justify-between rounded-[7px] px-2.5 py-[7px]"
          style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}
        >
          <span className="text-[11px] font-bold uppercase tracking-wide text-[#64748b]">
            Risk : Reward
          </span>
          <span className="text-base font-extrabold tabular-nums" style={{ color: rrClass }}>
            1 : {setup.riskReward.toFixed(1)}
          </span>
        </div>

        {/* Confidence */}
        <div className="mt-2.5 rounded-[7px] border border-[#1e293b] bg-[#0a111e] p-[8px_10px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#475569]">
              Confidence
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[15px] font-black tabular-nums"
                style={{ color: confBarColor(setup.confidenceLevel) }}
              >
                {Math.round(setup.confidencePct)}%
              </span>
              <span
                className="rounded-[5px] px-2 py-0.5 text-[10px] font-extrabold tracking-wide"
                style={{ background: confStyle.bg, color: confStyle.color }}
              >
                {setup.confidenceLevel}
              </span>
            </div>
          </div>
          <div className="w-full h-1 rounded-[3px] bg-[#1e293b] overflow-hidden">
            <div
              className="h-full rounded-[3px] transition-[width] duration-400"
              style={{
                width: `${setup.confidencePct}%`,
                background: confBarColor(setup.confidenceLevel),
              }}
            />
          </div>
          <div className="mt-[5px] text-[10px] leading-[1.4] text-[#475569]">
            {setup.confidenceReason}
          </div>
        </div>

        {/* ICT Tags */}
        <div className="mt-2.5 flex flex-wrap gap-[5px]">
          {setup.tags.map((tag) => {
            const s = TAG_STYLES[tag] ?? TAG_STYLES.fvg;
            return (
              <span
                key={tag}
                className="rounded px-[7px] py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ background: s.bg, color: s.color, letterSpacing: "0.3px" }}
              >
                {getTagLabel(tag, setup.direction, setup.isMTF)}
              </span>
            );
          })}
        </div>

        {/* Market structure */}
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#475569]">
          Structure: <StructurePill bias={setup.structure} />
        </div>
      </div>
    </div>
  );
}

// ── Skeleton card for loading state ──

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] overflow-hidden animate-pulse">
      <div className="flex items-center gap-[7px] px-3.5 py-[11px] border-b border-[#1e293b]">
        <div className="h-5 w-14 rounded-[5px] bg-[#1e293b]" />
        <div className="h-4 w-28 rounded bg-[#1e293b]" />
        <div className="ml-auto h-4 w-8 rounded bg-[#1e293b]" />
      </div>
      <div className="px-3.5 py-3 space-y-2.5">
        <div className="h-4 w-full rounded bg-[#1e293b]" />
        <div className="h-4 w-3/4 rounded bg-[#1e293b]" />
        <div className="h-4 w-full rounded bg-[#1e293b]" />
        <div className="h-4 w-2/3 rounded bg-[#1e293b]" />
        <div className="h-8 w-full rounded-[7px] bg-[#1e293b]" />
        <div className="h-16 w-full rounded-[7px] bg-[#1e293b]" />
        <div className="flex gap-[5px]">
          <div className="h-5 w-12 rounded bg-[#1e293b]" />
          <div className="h-5 w-16 rounded bg-[#1e293b]" />
          <div className="h-5 w-10 rounded bg-[#1e293b]" />
        </div>
      </div>
    </div>
  );
}

// ── Filter pill sub-component ──

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors cursor-pointer border-none outline-none"
      style={{
        background: active ? "rgba(59,130,246,0.15)" : "rgba(30,41,59,0.5)",
        color: active ? "#60a5fa" : "#475569",
      }}
    >
      {label}
    </button>
  );
}

// ── Main component ──

const SCAN_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export default function SetupScanner() {
  const [allSetups, setAllSetups] = useState<TradeSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [directionFilter, setDirectionFilter] = useState<"ALL" | Direction>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | SetupStatus>("ALL");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAllSetups = useCallback(async () => {
    try {
      const results = await Promise.allSettled(
        SYMBOLS.map(async (symbol) => {
          const res = await fetch(`/api/analysis?symbol=${symbol}`);
          if (!res.ok) return [];
          const data = await res.json();
          const setups: GeneratedSetup[] = data.setups ?? [];
          return setups.map((s) => mapSetupToCard(s, symbol));
        })
      );

      const merged: TradeSetup[] = [];
      for (const result of results) {
        if (result.status === "fulfilled") {
          merged.push(...result.value);
        }
      }

      // Sort by confidence (score) descending -- highest confluence first
      merged.sort((a, b) => b.confidencePct - a.confidencePct);

      setAllSetups(merged);
      setError(null);
    } catch (err) {
      setError("Failed to scan markets. Retrying...");
      console.error("SetupScanner fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllSetups();
    intervalRef.current = setInterval(fetchAllSetups, SCAN_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAllSetups]);

  // Apply filters
  const filtered = allSetups.filter((s) => {
    if (directionFilter !== "ALL" && s.direction !== directionFilter) return false;
    if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#1e293b]">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-slate-200 m-0">
          Setup Scanner
        </h3>
        {!loading && allSetups.length > 0 && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-extrabold tabular-nums"
            style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa" }}
          >
            {allSetups.length}
          </span>
        )}
        {loading && (
          <span className="flex items-center gap-1.5 text-[10px] text-[#475569] uppercase tracking-wider font-bold">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-[#60a5fa] animate-pulse"
            />
            Scanning...
          </span>
        )}
      </div>

      {/* Filters */}
      {!loading && allSetups.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#334155] mr-1">Dir</span>
            <FilterPill label="All" active={directionFilter === "ALL"} onClick={() => setDirectionFilter("ALL")} />
            <FilterPill label="Long" active={directionFilter === "LONG"} onClick={() => setDirectionFilter("LONG")} />
            <FilterPill label="Short" active={directionFilter === "SHORT"} onClick={() => setDirectionFilter("SHORT")} />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#334155] mr-1">Status</span>
            <FilterPill label="All" active={statusFilter === "ALL"} onClick={() => setStatusFilter("ALL")} />
            <FilterPill label="Active" active={statusFilter === "active"} onClick={() => setStatusFilter("active")} />
            <FilterPill label="Watch" active={statusFilter === "watch"} onClick={() => setStatusFilter("watch")} />
            <FilterPill label="Pending" active={statusFilter === "pending"} onClick={() => setStatusFilter("pending")} />
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-lg border border-[#1e293b] bg-[#0f172a] p-4 text-xs text-[#f87171] mb-3">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-6 text-sm text-[#64748b]">
          {allSetups.length === 0
            ? "No clear setups detected. Market may be mid-range or choppy. Wait for a cleaner structure to form."
            : "No setups match the current filters."}
        </div>
      )}

      {/* Setup cards */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-3">
          {filtered.map((setup, i) => (
            <SetupCard key={`${setup.instrumentName}-${setup.timeframe}-${setup.direction}-${i}`} setup={setup} />
          ))}
        </div>
      )}
    </div>
  );
}
