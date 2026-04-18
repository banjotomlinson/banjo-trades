"use client";

import { useMemo, useState } from "react";
import {
  INSTRUMENTS,
  calculatePosition,
  type AssetClass,
  type Instrument,
} from "@/lib/positionCalc";

const ASSET_CLASSES: { key: AssetClass; label: string }[] = [
  { key: "futures", label: "Futures" },
  { key: "commodities", label: "Commodities" },
  { key: "forex", label: "Forex" },
  { key: "crypto", label: "Crypto" },
];

function formatUsd(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNum(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function PositionCalculator() {
  const [assetClass, setAssetClass] = useState<AssetClass>("futures");

  const instruments = useMemo(
    () => INSTRUMENTS.filter((i) => i.assetClass === assetClass),
    [assetClass]
  );

  const [symbol, setSymbol] = useState<string>(instruments[0].symbol);
  const instrument: Instrument =
    instruments.find((i) => i.symbol === symbol) ?? instruments[0];

  const [direction, setDirection] = useState<"long" | "short">("long");
  const [accountBalance, setAccountBalance] = useState("50000");
  const [riskPct, setRiskPct] = useState("1");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");

  function handleAssetClassChange(ac: AssetClass) {
    setAssetClass(ac);
    const first = INSTRUMENTS.find((i) => i.assetClass === ac);
    if (first) setSymbol(first.symbol);
    setEntry("");
    setStop("");
    setTarget("");
  }

  const result = useMemo(() => {
    return calculatePosition({
      instrument,
      direction,
      accountBalance: parseFloat(accountBalance) || 0,
      riskPct: parseFloat(riskPct) || 0,
      entry: parseFloat(entry) || 0,
      stop: parseFloat(stop) || 0,
      target: target ? parseFloat(target) : undefined,
    });
  }, [instrument, direction, accountBalance, riskPct, entry, stop, target]);

  const showResults =
    entry !== "" && stop !== "" && accountBalance !== "" && riskPct !== "";

  return (
    <div className="bg-panel border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">
          Position Calculator
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Size your trade by account risk, instrument, and stop distance.
        </p>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted font-semibold mb-1.5">
              Asset Class
            </label>
            <div className="flex gap-1 bg-background rounded-lg p-1 border border-border">
              {ASSET_CLASSES.map((a) => (
                <button
                  key={a.key}
                  onClick={() => handleAssetClassChange(a.key)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    assetClass === a.key
                      ? "bg-accent text-white"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted font-semibold mb-1.5">
              Instrument
            </label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
            >
              {instruments.map((i) => (
                <option key={i.symbol} value={i.symbol}>
                  {i.symbol} — {i.name}
                </option>
              ))}
            </select>
            <div className="text-[11px] text-muted mt-1">
              ${instrument.pointValue.toLocaleString()} per point · tick{" "}
              {instrument.tickSize} = ${instrument.tickValue}
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted font-semibold mb-1.5">
              Direction
            </label>
            <div className="flex gap-1 bg-background rounded-lg p-1 border border-border">
              <button
                onClick={() => setDirection("long")}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  direction === "long"
                    ? "bg-bull text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Long
              </button>
              <button
                onClick={() => setDirection("short")}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  direction === "short"
                    ? "bg-bear text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Short
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted font-semibold mb-1.5">
                Account Balance
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(e.target.value)}
                  className="w-full bg-background border border-border rounded-md pl-6 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted font-semibold mb-1.5">
                Risk per Trade
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={riskPct}
                  onChange={(e) => setRiskPct(e.target.value)}
                  className="w-full bg-background border border-border rounded-md pl-3 pr-7 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm">
                  %
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted font-semibold mb-1.5">
                Entry
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="0.00"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-muted font-semibold mb-1.5">
                Stop
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={stop}
                onChange={(e) => setStop(e.target.value)}
                placeholder="0.00"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-muted font-semibold mb-1.5">
                Target
                <span className="text-muted/70 font-normal"> (opt.)</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="0.00"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        <div className="bg-background border border-border rounded-lg p-4">
          <div className="text-xs text-muted font-semibold uppercase tracking-wide mb-3">
            Results
          </div>

          {!showResults ? (
            <div className="text-sm text-muted py-8 text-center">
              Fill in entry and stop to compute your position size.
            </div>
          ) : result.errors.length > 0 ? (
            <div className="space-y-1">
              {result.errors.map((e, i) => (
                <div key={i} className="text-xs text-bear">
                  {e}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between pb-3 border-b border-border">
                <span className="text-xs text-muted">Position size</span>
                <span className="text-2xl font-bold text-accent">
                  {result.positionSizeRounded.toLocaleString("en-US", {
                    maximumFractionDigits: 4,
                  })}{" "}
                  <span className="text-sm text-muted font-medium">
                    {instrument.unitLabel}
                    {result.positionSizeRounded === 1 ? "" : "s"}
                  </span>
                </span>
              </div>

              <Row label="Risk budget" value={formatUsd(result.riskAmount)} />
              <Row
                label="Stop distance"
                value={`${formatNum(
                  result.stopDistancePoints,
                  instrument.priceDecimals
                )} pts`}
              />
              <Row
                label={`$ per ${instrument.unitLabel} at stop`}
                value={formatUsd(result.dollarPerUnit)}
              />
              <Row
                label="Potential loss"
                value={formatUsd(-result.potentialLoss)}
                tone="bear"
              />
              {result.potentialProfit !== null && (
                <>
                  <Row
                    label="Potential profit"
                    value={formatUsd(result.potentialProfit)}
                    tone="bull"
                  />
                  <Row
                    label="Risk / Reward"
                    value={`1 : ${formatNum(result.rrRatio ?? 0)}`}
                  />
                </>
              )}
              <Row
                label="Notional value"
                value={formatUsd(result.positionValue)}
              />

              {result.positionSize > 0 && result.positionSizeRounded === 0 && (
                <div className="text-[11px] text-warning mt-2">
                  Calculated size rounds to zero {instrument.unitLabel}s — the
                  smallest tradable unit would exceed your risk budget.
                </div>
              )}
            </div>
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
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}
