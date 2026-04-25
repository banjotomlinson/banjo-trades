import Header from "@/components/layout/Header";
import FeedbackBoard from "@/components/dashboard/FeedbackBoard";

export default function FeedbackPage() {
  return (
    <div className="p-4 sm:p-6 max-w-[1800px] mx-auto space-y-6">
      <Header />
      <FeedbackBoard />
    </div>
  );
}
