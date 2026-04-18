"use client";

import EconomicCalendar from "./EconomicCalendar";
import BreakingNews from "./BreakingNews";
import type { CalendarEvent, NewsItem } from "@/lib/data";

interface CalendarPageClientProps {
  initialEvents: CalendarEvent[];
  initialNews: NewsItem[];
}

export default function CalendarPageClient({
  initialEvents,
  initialNews,
}: CalendarPageClientProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
      <EconomicCalendar initialEvents={initialEvents} />
      <BreakingNews initialNews={initialNews} />
    </div>
  );
}
