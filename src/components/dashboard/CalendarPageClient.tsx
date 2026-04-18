"use client";

import { useState } from "react";
import SignalTabs, { type SignalCategory, type ViewTab } from "./SignalTabs";
import EconomicCalendar from "./EconomicCalendar";
import type { CalendarEvent } from "@/lib/data";

interface CalendarPageClientProps {
  initialEvents: CalendarEvent[];
}

export default function CalendarPageClient({
  initialEvents,
}: CalendarPageClientProps) {
  const [activeCategory, setActiveCategory] = useState<SignalCategory>("futures");
  const [activeView, setActiveView] = useState<ViewTab>("daily");

  return (
    <>
      <SignalTabs
        activeCategory={activeCategory}
        activeView={activeView}
        onCategoryChange={setActiveCategory}
        onViewChange={setActiveView}
      />
      <EconomicCalendar initialEvents={initialEvents} />
    </>
  );
}
