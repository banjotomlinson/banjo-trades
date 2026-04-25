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

function openPopout() {
  // Sized so it fits next to a TradingView chart on a typical 1080p monitor.
  const features = "popup=yes,width=440,height=720,resizable=yes,scrollbars=yes";
  const w = window.open("/popouts/calculator", "banjoCalc", features);
  if (w) w.focus();
}

export default function PositionCalculator({ embedded = false }: PositionCalculatorProps = {}) {
  const { mode } = useTradingMode();
  const [symbol, setSymbol] = useState<string>("NQ");
  const instrument: Instrument =
    INSTRUMENTS.find((i) => i.symbol === symbol) ?? INSTRUMENTS[0];

  const visibleClasses = useMemo<AssetClass[]>(
    () =>
      mode === "all"
        ? ASSET_CLASS_ORDER
        : (ASSET_CLASS_ORDER.filter((ac) => ac === mode) as AssetClass[]),
    [mode]
  );

  const grouped = useMemo(() => {
    return visibleClasses.map((ac) => ({
      assetClass: ac,
      label: ASSET_CLASS_LABELS[ac],
      items: INSTRUMENTS.filter((i) => i.assetClass === ac),
    }));
  }, [visibleClasses]);

  // If active symbol no longer matches the visible classes, snap to first in list.
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
  const size = isCrypto
    ? Math.floor(rawSize * 10000) / 10000
    : Math.floor(rawSize);

  const actualRisk = size * dollarPerUnit;
  const showResult = riskNum > 0 && stopNum > 0;

  return (
    <div className="bg-panel border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Position Calculator
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Size your trade by risk amount and stop distance in points.
          </p>
        </div>
        {!embedded && (
          <button
            onClick={openPopout}
            title="Pop out into a separate window"
            aria-label="Pop out calculator"
            className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-foreground border border-border hover:border-muted rounded-md px-2.5 py-1.5 transition-colors"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 4h6v6" />
              <path d="M20 4l-8 8" />
              <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
            </svg>
            Pop out
          </button>
        )}
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted font-semibold mb-1.5">
              Contract
            </label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23888%22 stroke-width=%222%22><polyline points=%226 9 12 15 18 9%22/></svg>')] bg-no-repeat bg-[right_0.75rem_center] pr-10"
            >
              {grouped.map((g) => (
                <optgroup key={g.assetClass} label={`— ${g.label} —`}>
                  {g.items.map((i) => (
                    <option key={i.symbol} value={i.symbol}>
                      {i.symbol} · {i.name} · ${i.pointValue.toLocaleString()}
                      /pt
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="text-[11px] text-muted mt-1.5 flex items-center gap-1.5">
              <span className="inline-block px-1.5 py-0.5 rounded bg-accent/10 text-accent font-semibold uppercase tracking-wide text-[10px]">
                {ASSET_CLASS_LABELS[instrument.assetClass]}
              </span>
              ${instrument.pointValue.toLocaleString()} per point ·{" "}
              {instrument.unitLabel}s
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted font-semibold mb-1.5">
              Risk Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">
                $
              </span>
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
            <label className="block text-xs text-muted font-semibold mb-1.5">
              Stop Loss (Points)
            </label>
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
                  {instrument.unitLabel}
                  {size === 1 ? "" : "s"} of {instrument.symbol}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-border space-y-2 text-xs">
                <Row
                  label="$ per point"
                  value={formatUsd(instrument.pointValue)}
                />
                <Row
                  label={`$ per ${instrument.unitLabel} at stop`}
                  value={formatUsd(dollarPerUnit)}
                />
                <Row
                  label="Actual risk at this size"
                  value={formatUsd(actualRisk)}
                  tone={actualRisk > riskNum ? "bear" : undefined}
                />
              </div>

              {rawSize > 0 && size === 0 && (
                <div className="text-[11px] text-warning mt-3 text-center">
                  Stop too wide — one {instrument.unitLabel} would exceed your
                  risk budget.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "bull" | "bear";
}) {
  const toneClass =
    tone === "bull"
      ? "text-bull"
      : tone === "bear"
      ? "text-bear"
      : "text-foreground";
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}
