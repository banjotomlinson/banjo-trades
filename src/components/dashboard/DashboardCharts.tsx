"use client";

import TradingViewChart from "./TradingViewChart";
import {
  useTradingMode,
  type TradingMode,
} from "@/components/providers/TradingModeProvider";

const MODE_CHARTS: Record<TradingMode, { symbol: string; label: string }[]> = {
  all: [
    { symbol: "PEPPERSTONE:NAS100", label: "NASDAQ 100" },
    { symbol: "FOREXCOM:SPXUSD", label: "S&P 500" },
  ],
  futures: [
    { symbol: "PEPPERSTONE:NAS100", label: "NASDAQ 100" },
    { symbol: "FOREXCOM:SPXUSD", label: "S&P 500" },
  ],
  commodities: [
    { symbol: "OANDA:XAUUSD", label: "Gold" },
    { symbol: "TVC:USOIL", label: "Crude Oil" },
  ],
  forex: [
    { symbol: "OANDA:EURUSD", label: "EUR/USD" },
    { symbol: "OANDA:GBPUSD", label: "GBP/USD" },
  ],
  crypto: [
    { symbol: "COINBASE:BTCUSD", label: "Bitcoin" },
    { symbol: "COINBASE:ETHUSD", label: "Ethereum" },
  ],
};

export default function DashboardCharts() {
  const { mode } = useTradingMode();
  const charts = MODE_CHARTS[mode];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {charts.map((c) => (
        <TradingViewChart
          key={`${mode}-${c.symbol}`}
          symbol={c.symbol}
          label={c.label}
        />
      ))}
    </div>
  );
}
