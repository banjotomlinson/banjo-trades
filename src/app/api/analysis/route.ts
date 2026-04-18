import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import {
  Candle,
  runICTAnalysis,
  buildSetups,
  extractLiquidityPools,
} from '@/lib/ict';

export const dynamic = 'force-dynamic';

// Yahoo Finance symbol mapping for supported instruments
const SYMBOL_MAP: Record<string, string> = {
  'NQ=F': 'NAS100',
  'ES=F': 'SPX',
  'EURUSD=X': 'EUR/USD',
  'GBPUSD=X': 'GBP/USD',
  'BTC-USD': 'BTC',
  'GC=F': 'Gold',
};

interface YahooChartResult {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
        }>;
      };
    }>;
    error?: { code: string; description: string };
  };
}

function yahooToCandles(data: YahooChartResult): Candle[] {
  const result = data?.chart?.result?.[0];
  if (!result?.timestamp || !result?.indicators?.quote?.[0]) return [];

  const ts = result.timestamp;
  const q = result.indicators.quote[0];
  const candles: Candle[] = [];

  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i];
    const h = q.high?.[i];
    const l = q.low?.[i];
    const c = q.close?.[i];
    if (o == null || h == null || l == null || c == null) continue;
    candles.push({ time: ts[i] * 1000, open: o, high: h, low: l, close: c });
  }

  return candles;
}

function curlGet(url: string): string {
  return execSync(
    `curl -s -H "User-Agent: Mozilla/5.0" "${url}"`,
    { encoding: 'utf8', timeout: 15000 }
  );
}

async function fetchYahooCandles(
  symbol: string,
  interval: string,
  range: string
): Promise<Candle[]> {
  const yahooUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const raw = curlGet(yahooUrl);
  const data: YahooChartResult = JSON.parse(raw);

  if (data?.chart?.error) {
    throw new Error(`Yahoo Finance error: ${data.chart.error.description}`);
  }

  return yahooToCandles(data);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'NQ=F';
  const interval = searchParams.get('interval') || '5m';
  const range = searchParams.get('range') || '5d';

  const instrumentName = SYMBOL_MAP[symbol] || symbol;

  try {
    // Fetch intraday and daily candles in parallel (daily is non-fatal)
    const [candles, dailyCandles] = await Promise.all([
      fetchYahooCandles(symbol, interval, range),
      fetchYahooCandles(symbol, '1d', '3mo').catch(() => [] as Candle[]),
    ]);

    if (!candles.length) {
      return NextResponse.json(
        { error: `No candle data returned for ${symbol}` },
        { status: 404 }
      );
    }

    const currentPrice = candles[candles.length - 1].close;

    // Run ICT analysis on intraday candles
    const analysis = runICTAnalysis(candles);

    // Build trade setups
    const setups = buildSetups(candles, analysis, instrumentName, interval);

    // Extract liquidity pools using both daily and hourly-equivalent candles
    // For liquidity pools we use the intraday candles as the h1 proxy
    const etNow = new Date();
    const liquidityPools = extractLiquidityPools(
      dailyCandles.length >= 10 ? dailyCandles : null,
      candles,
      currentPrice,
      etNow,
      {
        bias: analysis.structure === 'bullish'
          ? 'BULLISH'
          : analysis.structure === 'bearish'
            ? 'BEARISH'
            : undefined,
      }
    );

    return NextResponse.json({
      analysis,
      setups,
      liquidityPools,
      currentPrice,
      symbol,
      instrumentName,
      interval,
      range,
      candleCount: candles.length,
      dailyCandleCount: dailyCandles.length,
      timestamp: Date.now(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[ICT Analysis] Error for ${symbol}:`, message);
    return NextResponse.json(
      { error: message, symbol },
      { status: 500 }
    );
  }
}
