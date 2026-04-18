import Header from "@/components/layout/Header";
import ReferenceGallery from "@/components/dashboard/ReferenceGallery";

export default function JournalPage() {
  return (
    <div className="p-4 sm:p-6 max-w-[1800px] mx-auto space-y-6">
      <Header />
      <ReferenceGallery />
    </div>
  );
}
