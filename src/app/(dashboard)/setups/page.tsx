import Header from "@/components/layout/Header";
import SetupScanner from "@/components/dashboard/SetupScanner";

export default function SetupsPage() {
  return (
    <div className="p-4 sm:p-6 max-w-[1800px] mx-auto space-y-6">
      <Header />
      <SetupScanner />
    </div>
  );
}
