import { NextRequest, NextResponse } from "next/server";
import { filterAndSort, type RawArticle } from "@/lib/news/filter";

interface FinnhubNews {
  id: number;
  headline: string;
  source: string;
  summary?: string;
  url: string;
  datetime: number;
  category: string;
}

let cachedRaw: FinnhubNews[] = [];
let lastFetch = 0;
const CACHE_TTL = 60 * 1000;

export async function GET(req: NextRequest) {
  const now = Date.now();
  const apiKey = process.env.FINNHUB_API_KEY;
  const keepAll = new URL(req.url).searchParams.get("all") === "1";

  if (!apiKey) {
    return NextResponse.json(
      { news: [], error: "FINNHUB_API_KEY not configured" },
      { status: 200 }
    );
  }

  if (cachedRaw.length === 0 || now - lastFetch >= CACHE_TTL) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`
      );
      if (res.ok) {
        cachedRaw = await res.json();
        lastFetch = now;
      }
    } catch {
      // keep stale cache
    }
  }

  const raw: RawArticle[] = cachedRaw.map((n) => ({
    id: n.id,
    headline: n.headline,
    source: n.source,
    summary: n.summary,
    url: n.url,
    datetime: n.datetime,
    category: n.category,
  }));

  const scored = filterAndSort(raw, keepAll);
  const news = scored.slice(0, 25).map((n) => ({
    id: n.id,
    headline: n.headline,
    source: n.source,
    url: n.url,
    datetime: n.datetime,
    priority: n.priority,
    score: n.score,
    kind: "news" as const,
  }));

  return NextResponse.json({ news });
}
