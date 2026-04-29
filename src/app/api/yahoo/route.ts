import { NextRequest, NextResponse } from "next/server";
import { getCandles, TTL_MS } from "@/lib/marketCache";

const ALLOWED_INTERVALS = new Set(Object.keys(TTL_MS));
const ALLOWED_RANGES = new Set([
  "1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max",
]);

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const interval = searchParams.get("interval") ?? "1d";
  const range = searchParams.get("range") ?? "5d";

  if (!symbol) {
    return NextResponse.json({ error: "missing symbol" }, { status: 400 });
  }
  if (!ALLOWED_INTERVALS.has(interval)) {
    return NextResponse.json({ error: "bad interval" }, { status: 400 });
  }
  if (!ALLOWED_RANGES.has(range)) {
    return NextResponse.json({ error: "bad range" }, { status: 400 });
  }

  try {
    const result = await getCandles(symbol, interval, range);
    const body = result.payload as Record<string, unknown>;
    return NextResponse.json(body, {
      headers: {
        // Vercel edge cache tier 1: serve identical requests for 30s without
        // even hitting this route. Combined with the Supabase cache tier,
        // upstream Yahoo calls effectively drop to zero per request.
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300",
        "X-Cache-Source": result.source,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "fetch failed" },
      { status: 502 }
    );
  }
}
