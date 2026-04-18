"use client";

import { useState } from "react";
import SignalTabs, { type SignalCategory, type ViewTab } from "./SignalTabs";
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
  const [activeCategory, setActiveCategory] =
    useState<SignalCategory>("futures");
  const [activeView, setActiveView] = useState<ViewTab>("daily");

  return (
    <>
      <SignalTabs
        activeCategory={activeCategory}
        activeView={activeView}
        onCategoryChange={setActiveCategory}
        onViewChange={setActiveView}
      />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
        <EconomicCalendar
          initialEvents={initialEvents}
          view={activeView}
          category={activeCategory}
        />
        <BreakingNews initialNews={initialNews} />
      </div>
    </>
  );
}
