import { NextRequest, NextResponse } from "next/server";
import { HOT_SYMBOLS, refreshRow } from "@/lib/marketCache";

// Called by Vercel Cron (see vercel.json) every 2 minutes. Walks the
// HOT_SYMBOLS manifest and refreshes each row from Yahoo. This is the
// only path that should cause heavy upstream traffic — user-facing
// /api/yahoo requests just read from Supabase.

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Small concurrency cap so we don't fan out 40 parallel calls to Yahoo
  // and trigger their rate limiter. 4 at a time is fine for ~36 rows.
  const concurrency = 4;
  const queue = [...HOT_SYMBOLS];
  const results: { key: string; ok: boolean; error?: string }[] = [];

  async function worker() {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) return;
      const res = await refreshRow(next.symbol, next.interval, next.range);
      results.push({
        key: `${next.symbol}|${next.interval}|${next.range}`,
        ...res,
      });
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  const okCount = results.filter((r) => r.ok).length;
  return NextResponse.json({
    refreshed: okCount,
    total: results.length,
    failed: results.filter((r) => !r.ok),
  });
}
