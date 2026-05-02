"use client";

import { useEffect, useMemo, useState } from "react";
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

const ASSET_CLASS_ORDER: AssetClass[] = ["futures", "commodities", "forex", "crypto"];

function formatUsd(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type PopoutState = "idle" | "opened-as-tab" | "blocked";

// ── Popup-blocked notice ──────────────────────────────────────────
function PopoutBlockedNotice({
  state,
  onDismiss,
}: {
  state: "opened-as-tab" | "blocked";
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.07] p-4 text-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="font-semibold text-amber-400">
          {state === "blocked"
            ? "Popups are blocked for this site"
            : "Chrome opened it as a tab instead of a window"}
        </p>
        <button
          onClick={onDismiss}
          className="text-[#64748b] hover:text-white transition-colors shrink-0 text-base leading-none"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      <p className="text-[#94a3b8] mb-3 text-xs leading-relaxed">
        To open it as a separate window you can drag to any monitor, allow
        popups for traderm8.com in Chrome:
      </p>

      <div className="space-y-2 text-xs text-[#cbd5e1]">
        <div className="flex gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-[#3b82f6]/20 text-[#60a5fa] flex items-center justify-center font-bold text-[10px]">A</span>
          <div>
            <p className="font-semibold mb-0.5">Quick way (address bar)</p>
            <p className="text-[#94a3b8]">Look for a small window icon at the right of Chrome&apos;s address bar → click it → <strong className="text-white">Always allow popups from traderm8.com</strong> → Done → click Pop out again.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-[#3b82f6]/20 text-[#60a5fa] flex items-center justify-center font-bold text-[10px]">B</span>
          <div>
            <p className="font-semibold mb-0.5">Settings way</p>
            <p className="text-[#94a3b8]">Click the lock icon (left of address bar) → <strong className="text-white">Pop-ups and redirects</strong> → change to <strong className="text-white">Allow</strong> → refresh the page → click Pop out again.</p>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/10">
        <a
          href="/popouts/calculator"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
        >
          Or open in a plain new tab →
        </a>
      </div>
    </div>
  );
}

interface PositionCalculatorProps {
  embedded?: boolean;
  popoutMode?: boolean;
}

export default function PositionCalculator({
  embedded = false,
  popoutMode = false,
}: PositionCalculatorProps = {}) {
  const { mode } = useTradingMode();
  const [popoutState, setPopoutState] = useState<PopoutState>("idle");
  const [symbol, setSymbol] = useState<string>("NQ");
  const instrument: Instrument = INSTRUMENTS.find((i) => i.symbol === symbol) ?? INSTRUMENTS[0];

  const visibleClasses = useMemo<AssetClass[]>(
    () => mode === "all" ? ASSET_CLASS_ORDER : ASSET_CLASS_ORDER.filter((ac) => ac === mode) as AssetClass[],
    [mode]
  );

  const grouped = useMemo(
    () => visibleClasses.map((ac) => ({
      assetClass: ac,
      label: ASSET_CLASS_LABELS[ac],
      items: INSTRUMENTS.filter((i) => i.assetClass === ac),
    })),
    [visibleClasses]
  );

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

  function openPopout() {
    const features = [
      "popup=yes",
      "width=460",
      "height=740",
      "resizable=yes",
      "scrollbars=no",
      "status=no",
      "toolbar=no",
      "menubar=no",
      "location=no",
    ].join(",");

    const w = window.open("/popouts/calculator", "traderm8_calc", features);

    if (!w) {
      setPopoutState("blocked");
      return;
    }

    w.focus();

    // Detect if Chrome silently opened it as a tab instead of a popup.
    // A real popup has outerWidth matching what we requested.
    // A tab has outerWidth = 0 (not yet rendered) or matches the full browser window.
    setTimeout(() => {
      try {
        const isTab =
          w.outerWidth === 0 ||
          w.outerWidth >= window.screen.availWidth * 0.8;
        if (isTab) setPopoutState("opened-as-tab");
      } catch {
        // Cross-origin or already closed — treat as success
      }
    }, 400);
  }

  const outerClass = popoutMode
    ? "h-full flex flex-col bg-background text-foreground"
    : "bg-panel border border-border rounded-xl overflow-hidden";

  return (
    <div className={outerClass}>
      <div className={`flex items-start justify-between gap-3 ${popoutMode ? "px-4 py-3 border-b border-border" : "px-5 py-4 border-b border-border"}`}>
        <div>
          <h2 className="text-base font-semibold text-foreground">Position Calculator</h2>
          <p className="text-xs text-muted mt-0.5">
            Size your trade by risk amount and stop distance in points.
          </p>
        </div>
        {!embedded && (
          <button
            onClick={openPopout}
            title="Pop out into a separate window (drag to any monitor)"
            aria-label="Pop out calculator"
            className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-foreground border border-border hover:border-muted rounded-md px-2.5 py-1.5 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M14 4h6v6" /><path d="M20 4l-8 8" /><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
            </svg>
            Pop out
          </button>
        )}
      </div>

      {/* Blocked notice */}
      {popoutState !== "idle" && (
        <div className="px-5 pt-4">
          <PopoutBlockedNotice
            state={popoutState}
            onDismiss={() => setPopoutState("idle")}
          />
        </div>
      )}

      <div className={`p-5 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5 ${popoutMode ? "flex-1 overflow-y-auto" : ""}`}>
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
              <input
                type="text"
                inputMode="decimal"
                value={riskAmount}
                onChange={(e) => setRiskAmount(e.target.value)}
                placeholder="500"
                className="w-full bg-background border border-border rounded-md pl-6 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted font-semibold mb-1.5">Stop Loss (Points)</label>
            <input
              type="text"
              inputMode="decimal"
              value={stopPoints}
              onChange={(e) => setStopPoints(e.target.value)}
              placeholder="10"
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="bg-background border border-border rounded-lg p-5 flex flex-col justify-center">
          <div className="text-xs text-muted font-semibold uppercase tracking-wide mb-3 text-center">
            {instrument.unitLabel}s Needed
          </div>
          {!showResult ? (
            <div className="text-sm text-muted py-8 text-center">
              Enter risk amount and stop loss points to calculate.
            </div>
          ) : (
            <>
              <div className="text-center">
                <div className="text-6xl font-bold text-accent leading-none">
                  {size.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                </div>
                <div className="text-xs text-muted mt-2">
                  {instrument.unitLabel}{size === 1 ? "" : "s"} of {instrument.symbol}
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-border space-y-2 text-xs">
                <Row label="$ per point" value={formatUsd(instrument.pointValue)} />
                <Row label={`$ per ${instrument.unitLabel} at stop`} value={formatUsd(dollarPerUnit)} />
                <Row label="Actual risk at this size" value={formatUsd(actualRisk)} tone={actualRisk > riskNum ? "bear" : undefined} />
              </div>
              {rawSize > 0 && size === 0 && (
                <div className="text-[11px] text-warning mt-3 text-center">
                  Stop too wide — one {instrument.unitLabel} would exceed your risk budget.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
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
