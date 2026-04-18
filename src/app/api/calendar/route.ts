import { NextRequest, NextResponse } from "next/server";

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

// Per-range cache so month navigation doesn't hammer Finnhub.
const cache = new Map<string, { events: CalendarEvent[]; at: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function formatVal(v: number | string | null, unit: string): string {
  if (v === null || v === undefined || v === "") return "";
  const s = typeof v === "number" ? String(v) : v;
  return unit ? `${s}${unit}` : s;
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

async function fetchFinnhub(
  from: string,
  to: string
): Promise<CalendarEvent[]> {
  const key = `${from}_${to}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.events;

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return hit?.events ?? [];

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${apiKey}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return hit?.events ?? [];
    const data: { economicCalendar?: FinnhubCalendarEvent[] } =
      await res.json();
    const raw = data.economicCalendar ?? [];

    const events = raw
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
    cache.set(key, { events, at: Date.now() });
    return events;
  } catch {
    return hit?.events ?? [];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  let from: string;
  let to: string;
  if (fromParam && toParam && isValidDate(fromParam) && isValidDate(toParam)) {
    from = fromParam;
    to = toParam;
  } else {
    const today = new Date();
    const fromD = new Date(today);
    fromD.setDate(fromD.getDate() - 7);
    const toD = new Date(today);
    toD.setDate(toD.getDate() + 45);
    from = fromD.toISOString().slice(0, 10);
    to = toD.toISOString().slice(0, 10);
  }

  const events = await fetchFinnhub(from, to);
  return NextResponse.json({ events });
}
