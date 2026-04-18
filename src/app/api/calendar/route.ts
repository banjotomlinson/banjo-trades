import { NextResponse } from "next/server";

interface FinnhubCalendarEvent {
  country: string;
  event: string;
  impact: string;
  time: string;
  actual: number | string | null;
  estimate: number | string | null;
  prev: number | string | null;
  unit: string;
}

interface CalendarEvent {
  title: string;
  country: string;
  date: string;
  impact: "high" | "medium" | "low";
  forecast: string;
  previous: string;
  actual: string;
}

let cachedEvents: CalendarEvent[] = [];
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000;

function formatVal(v: number | string | null, unit: string): string {
  if (v === null || v === undefined || v === "") return "";
  const s = typeof v === "number" ? String(v) : v;
  return unit ? `${s}${unit}` : s;
}

async function fetchFinnhub(): Promise<CalendarEvent[]> {
  const now = Date.now();
  if (cachedEvents.length > 0 && now - lastFetch < CACHE_TTL) {
    return cachedEvents;
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return cachedEvents;

  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 7);
  const to = new Date(today);
  to.setDate(to.getDate() + 45);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/economic?from=${iso(
        from
      )}&to=${iso(to)}&token=${apiKey}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return cachedEvents;
    const data: { economicCalendar?: FinnhubCalendarEvent[] } =
      await res.json();
    const raw = data.economicCalendar ?? [];

    cachedEvents = raw
      .filter((e) => ["high", "medium", "low"].includes(e.impact))
      .map((e) => ({
        title: e.event,
        country: e.country,
        date: e.time.includes("T")
          ? e.time
          : `${e.time.replace(" ", "T")}Z`,
        impact: e.impact.toLowerCase() as "high" | "medium" | "low",
        forecast: formatVal(e.estimate, e.unit),
        previous: formatVal(e.prev, e.unit),
        actual: formatVal(e.actual, e.unit),
      }));
    lastFetch = now;
    return cachedEvents;
  } catch {
    return cachedEvents;
  }
}

export async function GET() {
  const events = await fetchFinnhub();
  return NextResponse.json({ events });
}
