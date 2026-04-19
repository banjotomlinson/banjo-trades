import Header from "@/components/layout/Header";
import MarketClocks from "@/components/dashboard/MarketClocks";
import TradingViewChart from "@/components/dashboard/TradingViewChart";
import CountdownBar from "@/components/dashboard/CountdownBar";
import MarketsSnapshot from "@/components/dashboard/MarketsSnapshot";
import SessionLevels from "@/components/dashboard/SessionLevels";
import PositionCalculator from "@/components/dashboard/PositionCalculator";

export default function Dashboard() {
  return (
    <div className="p-4 sm:p-6 max-w-[1800px] mx-auto space-y-6">
      <Header />
      <MarketClocks />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TradingViewChart symbol="PEPPERSTONE:NAS100" label="NASDAQ 100" slot="chart-left" />
        <TradingViewChart symbol="FOREXCOM:SPXUSD" label="S&P 500" slot="chart-right" />
      </div>

      <CountdownBar />
      <MarketsSnapshot />
      <SessionLevels />
      <PositionCalculator />
    </div>
  );
}
