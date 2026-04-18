import Header from "@/components/layout/Header";
import CalendarPageClient from "@/components/dashboard/CalendarPageClient";
import { fetchCalendarEvents, fetchNews } from "@/lib/data";

export default async function CalendarPage() {
  const [events, news] = await Promise.all([
    fetchCalendarEvents(),
    fetchNews(),
  ]);

  return (
    <div className="p-4 sm:p-6 max-w-[1800px] mx-auto space-y-6">
      <Header />
      <CalendarPageClient initialEvents={events} initialNews={news} />
    </div>
  );
}
