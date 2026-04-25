import Header from "@/components/layout/Header";
import SeasonalityPanel from "@/components/dashboard/SeasonalityPanel";

export default function SeasonalityPage() {
  return (
    <div className="p-4 sm:p-6 max-w-[1800px] mx-auto space-y-6">
      <Header />
      <SeasonalityPanel />
    </div>
  );
}
