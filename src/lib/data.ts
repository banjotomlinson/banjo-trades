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
  url: string;
  datetime: number;
  category: string;
}

interface ForexEvent {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
}

export async function fetchNews(): Promise<NewsItem[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data: FinnhubNews[] = await res.json();
    return data.slice(0, 30).map((n) => ({
      id: n.id,
      headline: n.headline,
      source: n.source,
      url: n.url,
      datetime: n.datetime,
    }));
  } catch {
    return [];
  }
}

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  try {
    const res = await fetch(
      "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const raw: ForexEvent[] = await res.json();

    return raw
      .filter(
        (e) =>
          e.country === "USD" &&
          ["High", "Medium", "Low"].includes(e.impact)
      )
      .map((e) => ({
        title: e.title,
        country: e.country,
        date: e.date,
        impact: e.impact.toLowerCase() as "high" | "medium" | "low",
        forecast: e.forecast || "",
        previous: e.previous || "",
        actual: "",
      }));
  } catch {
    return [];
  }
}
