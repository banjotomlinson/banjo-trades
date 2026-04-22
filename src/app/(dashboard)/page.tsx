import Header from "@/components/layout/Header";
import MarketClocks from "@/components/dashboard/MarketClocks";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import CountdownBar from "@/components/dashboard/CountdownBar";
import MarketsSnapshot from "@/components/dashboard/MarketsSnapshot";
import SessionLevels from "@/components/dashboard/SessionLevels";
import PositionCalculator from "@/components/dashboard/PositionCalculator";

export default function Dashboard() {
  return (
    <div className="p-4 sm:p-6 max-w-[1800px] mx-auto space-y-6">
      <Header />
      <MarketClocks />
      <DashboardCharts />
      <CountdownBar />
      <MarketsSnapshot />
      <SessionLevels />
      <PositionCalculator />
    </div>
  );
}
