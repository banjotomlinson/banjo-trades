import Header from "@/components/layout/Header";
import BreakingNews from "@/components/dashboard/BreakingNews";
import { fetchNews } from "@/lib/data";

export default async function NewsPage() {
  const news = await fetchNews();

  return (
    <div className="p-4 sm:p-6 max-w-[1800px] mx-auto space-y-6">
      <Header />
      <BreakingNews initialNews={news} />
    </div>
  );
}
