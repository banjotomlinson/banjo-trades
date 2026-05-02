"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  INSTRUMENTS,
  type AssetClass,
  type Instrument,
} from "@/lib/positionCalc";
import { useTradingMode } from "@/components/providers/TradingModeProvider";

const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  futures: "Index Futures",
  commodities: "Commodities",
  forex: "Forex",
  crypto: "Crypto",
};

const ASSET_CLASS_ORDER: AssetClass[] = [
  "futures",
  "commodities",
  "forex",
  "crypto",
];

function formatUsd(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface PositionCalculatorProps {
  embedded?: boolean;
}

// ── Draggable floating panel ──────────────────────────────────────
function FloatingCalc({ onClose }: { onClose: () => void }) {
  const { mode } = useTradingMode();
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: Math.max(0, (typeof window !== "undefined" ? window.innerWidth : 1200) - 480), y: 80 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 440, e.clientX - offset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - offset.current.y)),
      });
    }
    function onMouseUp() { dragging.current = false; }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const [symbol, setSymbol] = useState<string>("NQ");
  const [riskAmount, setRiskAmount] = useState("");
  const [stopPoints, setStopPoints] = useState("");

  const instrument: Instrument = INSTRUMENTS.find((i) => i.symbol === symbol) ?? INSTRUMENTS[0];

  const visibleClasses = useMemo<AssetClass[]>(
    () => mode === "all" ? ASSET_CLASS_ORDER : ASSET_CLASS_ORDER.filter((ac) => ac === mode) as AssetClass[],
    [mode]
  );
  const grouped = useMemo(
    () => visibleClasses.map((ac) => ({ assetClass: ac, label: ASSET_CLASS_LABELS[ac], items: INSTRUMENTS.filter((i) => i.assetClass === ac) })),
    [visibleClasses]
  );

  useEffect(() => {
    if (!visibleClasses.includes(instrument.assetClass)) {
      const first = INSTRUMENTS.find((i) => visibleClasses.includes(i.assetClass));
      if (first) setSymbol(first.symbol);
    }
  }, [visibleClasses, instrument.assetClass]);

  const riskNum = parseFloat(riskAmount) || 0;
  const stopNum = parseFloat(stopPoints) || 0;
  const dollarPerUnit = stopNum * instrument.pointValue;
  const rawSize = dollarPerUnit > 0 ? riskNum / dollarPerUnit : 0;
  const isCrypto = instrument.assetClass === "crypto";
  const size = isCrypto ? Math.floor(rawSize * 10000) / 10000 : Math.floor(rawSize);
  const actualRisk = size * dollarPerUnit;
  const showResult = riskNum > 0 && stopNum > 0;

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[9999] shadow-2xl rounded-xl overflow-hidden"
      style={{
        left: pos.x,
        top: pos.y,
        width: 420,
        background: "#111827",
        border: "1px solid #1e293b",
      }}
    >
      {/* Drag handle / header */}
      <div
        onMouseDown={onMouseDown}
        className="flex items-center justify-between px-4 py-3 cursor-grab active:cursor-grabbing select-none"
        style={{ borderBottom: "1px solid var(--color-border, #1e293b)", background: "rgba(255,255,255,0.03)" }}
      >
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#475569]" aria-hidden>
            <circle cx="9" cy="5" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="5" r="1" fill="currentColor" stroke="none" />
            <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="9" cy="19" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="19" r="1" fill="currentColor" stroke="none" />
          </svg>
          <span className="text-sm font-semibold text-white">Position Calculator</span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[#64748b] hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Contract */}
        <div>
          <label className="block text-xs text-[#64748b] font-semibold mb-1.5">Contract</label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-md px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#3b82f6] appearance-none"
          >
            {grouped.map((g) => (
              <optgroup key={g.assetClass} label={`— ${g.label} —`}>
                {g.items.map((i) => (
                  <option key={i.symbol} value={i.symbol}>
                    {i.symbol} · {i.name} · ${i.pointValue.toLocaleString()}/pt
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#64748b] font-semibold mb-1.5">Risk Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] text-sm">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={riskAmount}
                onChange={(e) => setRiskAmount(e.target.value)}
                placeholder="500"
                className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-md pl-6 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#64748b] font-semibold mb-1.5">Stop (Points)</label>
            <input
              type="text"
              inputMode="decimal"
              value={stopPoints}
              onChange={(e) => setStopPoints(e.target.value)}
              placeholder="10"
              className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]"
            />
          </div>
        </div>

        {/* Result */}
        <div className="bg-[#0a0e17] border border-[#1e293b] rounded-lg p-4">
          {!showResult ? (
            <p className="text-sm text-[#475569] text-center py-2">Enter risk amount and stop to calculate.</p>
          ) : (
            <>
              <div className="text-center mb-4">
                <div className="text-5xl font-bold text-[#3b82f6] leading-none">
                  {size.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                </div>
                <div className="text-xs text-[#64748b] mt-1">
                  {instrument.unitLabel}{size === 1 ? "" : "s"} of {instrument.symbol}
                </div>
              </div>
              <div className="space-y-1.5 text-xs border-t border-[#1e293b] pt-3">
                <div className="flex justify-between"><span className="text-[#64748b]">$ per point</span><span className="font-semibold text-white">{formatUsd(instrument.pointValue)}</span></div>
                <div className="flex justify-between"><span className="text-[#64748b]">$ per {instrument.unitLabel} at stop</span><span className="font-semibold text-white">{formatUsd(dollarPerUnit)}</span></div>
                <div className="flex justify-between"><span className="text-[#64748b]">Actual risk</span><span className={`font-semibold ${actualRisk > riskNum ? "text-red-400" : "text-white"}`}>{formatUsd(actualRisk)}</span></div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function openPopout(onBlocked: () => void) {
  const w = window.open(
    "/popouts/calculator",
    "banjoCalc",
    "popup=yes,width=440,height=720,resizable=yes,scrollbars=yes"
  );
  // If browser blocked the popup, fall back to the in-page floating panel
  if (!w || w.closed || typeof w.closed === "undefined") {
    onBlocked();
  } else {
    w.focus();
  }
}

export default function PositionCalculator({ embedded = false }: PositionCalculatorProps = {}) {
  const { mode } = useTradingMode();
  const [floatOpen, setFloatOpen] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [symbol, setSymbol] = useState<string>("NQ");
  const instrument: Instrument = INSTRUMENTS.find((i) => i.symbol === symbol) ?? INSTRUMENTS[0];

  const visibleClasses = useMemo<AssetClass[]>(
    () => mode === "all" ? ASSET_CLASS_ORDER : ASSET_CLASS_ORDER.filter((ac) => ac === mode) as AssetClass[],
    [mode]
  );

  const grouped = useMemo(() => {
    return visibleClasses.map((ac) => ({
      assetClass: ac,
      label: ASSET_CLASS_LABELS[ac],
      items: INSTRUMENTS.filter((i) => i.assetClass === ac),
    }));
  }, [visibleClasses]);

  useEffect(() => {
    if (!visibleClasses.includes(instrument.assetClass)) {
      const first = INSTRUMENTS.find((i) => visibleClasses.includes(i.assetClass));
      if (first) setSymbol(first.symbol);
    }
  }, [visibleClasses, instrument.assetClass]);

  const [riskAmount, setRiskAmount] = useState("");
  const [stopPoints, setStopPoints] = useState("");

  const riskNum = parseFloat(riskAmount) || 0;
  const stopNum = parseFloat(stopPoints) || 0;
  const dollarPerUnit = stopNum * instrument.pointValue;
  const rawSize = dollarPerUnit > 0 ? riskNum / dollarPerUnit : 0;
  const isCrypto = instrument.assetClass === "crypto";
  const size = isCrypto ? Math.floor(rawSize * 10000) / 10000 : Math.floor(rawSize);
  const actualRisk = size * dollarPerUnit;
  const showResult = riskNum > 0 && stopNum > 0;

  return (
    <>
      {floatOpen && <FloatingCalc onClose={() => setFloatOpen(false)} />}

      <div className="bg-panel border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Position Calculator</h2>
            <p className="text-xs text-muted mt-0.5">Size your trade by risk amount and stop distance in points.</p>
          </div>
          {!embedded && (
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => openPopout(() => { setFloatOpen(true); setPopupBlocked(true); })}
                title="Pop out into a separate window (drag across monitors)"
                aria-label="Pop out calculator"
                className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-foreground border border-border hover:border-muted rounded-md px-2.5 py-1.5 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M14 4h6v6" /><path d="M20 4l-8 8" /><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
                </svg>
                Pop out
              </button>
              {popupBlocked && (
                <p className="text-[10px] text-muted text-right max-w-[180px] leading-tight">
                  Allow popups for traderm8.com to enable multi-monitor mode
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-muted font-semibold mb-1.5">Contract</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23888%22 stroke-width=%222%22><polyline points=%226 9 12 15 18 9%22/></svg>')] bg-no-repeat bg-[right_0.75rem_center] pr-10"
              >
                {grouped.map((g) => (
                  <optgroup key={g.assetClass} label={`— ${g.label} —`}>
                    {g.items.map((i) => (
                      <option key={i.symbol} value={i.symbol}>
                        {i.symbol} · {i.name} · ${i.pointValue.toLocaleString()}/pt
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div className="text-[11px] text-muted mt-1.5 flex items-center gap-1.5">
                <span className="inline-block px-1.5 py-0.5 rounded bg-accent/10 text-accent font-semibold uppercase tracking-wide text-[10px]">
                  {ASSET_CLASS_LABELS[instrument.assetClass]}
                </span>
                ${instrument.pointValue.toLocaleString()} per point · {instrument.unitLabel}s
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted font-semibold mb-1.5">Risk Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                <input type="text" inputMode="decimal" value={riskAmount} onChange={(e) => setRiskAmount(e.target.value)} placeholder="500" className="w-full bg-background border border-border rounded-md pl-6 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted font-semibold mb-1.5">Stop Loss (Points)</label>
              <input type="text" inputMode="decimal" value={stopPoints} onChange={(e) => setStopPoints(e.target.value)} placeholder="10" className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent" />
            </div>
          </div>

          <div className="bg-background border border-border rounded-lg p-5 flex flex-col justify-center">
            <div className="text-xs text-muted font-semibold uppercase tracking-wide mb-3 text-center">
              {instrument.unitLabel}s Needed
            </div>
            {!showResult ? (
              <div className="text-sm text-muted py-8 text-center">Enter risk amount and stop loss points to calculate.</div>
            ) : (
              <>
                <div className="text-center">
                  <div className="text-6xl font-bold text-accent leading-none">
                    {size.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                  </div>
                  <div className="text-xs text-muted mt-2">{instrument.unitLabel}{size === 1 ? "" : "s"} of {instrument.symbol}</div>
                </div>
                <div className="mt-5 pt-4 border-t border-border space-y-2 text-xs">
                  <Row label="$ per point" value={formatUsd(instrument.pointValue)} />
                  <Row label={`$ per ${instrument.unitLabel} at stop`} value={formatUsd(dollarPerUnit)} />
                  <Row label="Actual risk at this size" value={formatUsd(actualRisk)} tone={actualRisk > riskNum ? "bear" : undefined} />
                </div>
                {rawSize > 0 && size === 0 && (
                  <div className="text-[11px] text-warning mt-3 text-center">Stop too wide — one {instrument.unitLabel} would exceed your risk budget.</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "bull" | "bear" }) {
  const toneClass = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : "text-foreground";
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}
