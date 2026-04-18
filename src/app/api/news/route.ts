import { NextResponse } from "next/server";

interface FinnhubNews {
  id: number;
  headline: string;
  source: string;
  url: string;
  datetime: number;
  category: string;
}

let cachedNews: FinnhubNews[] = [];
let lastFetch = 0;
const CACHE_TTL = 60 * 1000;

export async function GET() {
  const now = Date.now();
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { news: [], error: "FINNHUB_API_KEY not configured" },
      { status: 200 }
    );
  }

  if (cachedNews.length > 0 && now - lastFetch < CACHE_TTL) {
    return NextResponse.json({ news: cachedNews });
  }

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`
    );
    if (!res.ok) return NextResponse.json({ news: cachedNews });
    const data: FinnhubNews[] = await res.json();
    cachedNews = data.slice(0, 30).map((n) => ({
      id: n.id,
      headline: n.headline,
      source: n.source,
      url: n.url,
      datetime: n.datetime,
      category: n.category,
    }));
    lastFetch = now;
    return NextResponse.json({ news: cachedNews });
  } catch {
    return NextResponse.json({ news: cachedNews });
  }
}
