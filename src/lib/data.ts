/**
 * Server-side data fetching functions for the dashboard.
 * These run during SSR so the page renders with data on first paint.
 */

export interface NewsItem {
  id: number;
  headline: string;
  source: string;
  url: string;
  datetime: number;
  // Set by the filter for UI prioritisation.
  priority?: "high" | "medium" | "low";
  score?: number;
  // Future: set to "tweet" when the Twitter integration lands.
  kind?: "news" | "tweet";
  author?: string;
}

export interface CalendarEvent {
  title: string;
  country: string;
  date: string;
  impact: "high" | "medium" | "low";
  forecast?: string;
  previous?: string;
  actual?: string;
}

interface FinnhubNews {
  id: number;
  headline: string;
  source: string;
  summary?: string;
  url: string;
  datetime: number;
  category: string;
}

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

function formatVal(v: number | string | null, unit: string): string {
  if (v === null || v === undefined || v === "") return "";
  const s = typeof v === "number" ? String(v) : v;
  return unit ? `${s}${unit}` : s;
}

export async function fetchNews(): Promise<NewsItem[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];

  try {
    const { filterAndSort } = await import("@/lib/news/filter");
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data: FinnhubNews[] = await res.json();
    const scored = filterAndSort(
      data.map((n) => ({
        id: n.id,
        headline: n.headline,
        source: n.source,
        summary: n.summary,
        url: n.url,
        datetime: n.datetime,
        category: n.category,
      }))
    );
    return scored.slice(0, 25).map((n) => ({
      id: n.id,
      headline: n.headline,
      source: n.source,
      url: n.url,
      datetime: n.datetime,
      priority: n.priority,
      score: n.score,
      kind: "news" as const,
    }));
  } catch {
    return [];
  }
}

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];

  // Window: 7 days back through 45 days ahead. Covers daily/weekly/monthly
  // views without needing a second fetch when the user scrolls.
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 7);
  const to = new Date(now);
  to.setDate(to.getDate() + 45);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/economic?from=${iso(
        from
      )}&to=${iso(to)}&token=${apiKey}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data: { economicCalendar?: FinnhubCalendarEvent[] } = await res.json();
    const raw = data.economicCalendar ?? [];

    return raw
      .filter((e) => ["high", "medium", "low"].includes(e.impact))
      .map((e) => ({
        title: e.event,
        country: e.country,
        // Finnhub returns "YYYY-MM-DD HH:mm:ss" in UTC; normalize to ISO.
        date: e.time.includes("T")
          ? e.time
          : `${e.time.replace(" ", "T")}Z`,
        impact: e.impact.toLowerCase() as "high" | "medium" | "low",
        forecast: formatVal(e.estimate, e.unit),
        previous: formatVal(e.prev, e.unit),
        actual: formatVal(e.actual, e.unit),
      }));
  } catch {
    return [];
  }
}
