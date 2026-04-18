import { NextResponse } from "next/server";

interface QuoteResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  prevClose: number;
}

export async function GET() {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { quotes: [], error: "FINNHUB_API_KEY not configured" },
      { status: 200 }
    );
  }

  const symbols = ["QQQ", "SPY"];
  const quotes: QuoteResult[] = [];

  try {
    const results = await Promise.all(
      symbols.map(async (sym) => {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${sym}&token=${apiKey}`
        );
        if (!res.ok) return null;
        const data = await res.json();
        return {
          symbol: sym,
          price: data.c || 0,
          change: data.d || 0,
          changePercent: data.dp || 0,
          high: data.h || 0,
          low: data.l || 0,
          prevClose: data.pc || 0,
        };
      })
    );

    results.forEach((r) => {
      if (r) quotes.push(r);
    });
  } catch {
    // fail silently
  }

  return NextResponse.json({ quotes });
}
