import Header from "@/components/layout/Header";
import LiquidityHeatmap from "@/components/dashboard/LiquidityHeatmap";

export default function LiquidityPage() {
  return (
    <div className="p-4 sm:p-6 max-w-[1800px] mx-auto space-y-6">
      <Header />
      <LiquidityHeatmap />
    </div>
  );
}
