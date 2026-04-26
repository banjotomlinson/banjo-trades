import Header from "@/components/layout/Header";
import PlannerBoard from "@/components/dashboard/PlannerBoard";

export default function PlannerPage() {
  return (
    <div className="p-4 sm:p-6 max-w-[1800px] mx-auto space-y-6">
      <Header />
      <PlannerBoard />
    </div>
  );
}
