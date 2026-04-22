import Header from "@/components/layout/Header";
import MoversPanel from "@/components/dashboard/MoversPanel";

export default function MarketMoversPage() {
  return (
    <div className="p-4 sm:p-6 max-w-[1800px] mx-auto space-y-6">
      <Header />
      <MoversPanel />
    </div>
  );
}
