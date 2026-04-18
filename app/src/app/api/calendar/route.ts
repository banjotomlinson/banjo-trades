import { NextResponse } from "next/server";

interface ForexEvent {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
}

let cachedEvents: ForexEvent[] = [];
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchForexFactory(): Promise<ForexEvent[]> {
  const now = Date.now();
  if (cachedEvents.length > 0 && now - lastFetch < CACHE_TTL) {
    return cachedEvents;
  }

  try {
    const weekUrl =
      "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
    const res = await fetch(weekUrl, { next: { revalidate: 300 } });
    if (!res.ok) return cachedEvents;
    const data = await res.json();
    cachedEvents = data;
    lastFetch = now;
    return data;
  } catch {
    return cachedEvents;
  }
}

export async function GET() {
  const raw = await fetchForexFactory();

  const events = raw
    .filter(
      (e: ForexEvent) =>
        e.country === "USD" &&
        ["High", "Medium", "Low"].includes(e.impact)
    )
    .map((e: ForexEvent) => ({
      title: e.title,
      country: e.country,
      date: e.date,
      impact: e.impact.toLowerCase(),
      forecast: e.forecast || "",
      previous: e.previous || "",
      actual: "",
    }));

  return NextResponse.json({ events });
}
