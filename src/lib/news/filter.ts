// News scoring + filtering for the Breaking News feed.
// Both SSR (lib/data.ts) and the polling API route (app/api/news/route.ts)
// run every Finnhub article through scoreItem(). Score = source weight +
// keyword matches − noise patterns. Anything that scores too low gets
// dropped before reaching the UI.

export interface RawArticle {
  id: number;
  headline: string;
  source: string;
  summary?: string;
  url: string;
  datetime: number;
  category?: string;
}

export interface ScoredArticle extends RawArticle {
  score: number;
  priority: "high" | "medium" | "low";
}

// Sources we trust — score boost. Everything else is neutral.
const SOURCE_WEIGHTS: Array<[RegExp, number]> = [
  [/reuters/i, 6],
  [/bloomberg/i, 6],
  [/financial times|^ft$|ft\.com/i, 6],
  [/wall street journal|^wsj$|wsj\.com/i, 6],
  [/cnbc/i, 5],
  [/marketwatch/i, 4],
  [/^barron'?s$|barrons\.com/i, 4],
  [/investing\.com/i, 3],
  [/yahoo/i, 3],
  [/fxstreet|forexlive/i, 3],
  [/kitco/i, 3],
  [/coindesk|cointelegraph|the block/i, 3],
  [/business insider|^bi$/i, 2],
  [/forbes/i, 1],
  // Penalise PR wires and listicle farms.
  [/pr newswire|business wire|globenewswire|accesswire|newsfile/i, -4],
  [/zacks|investorplace|motley fool|the street|fool\.com/i, -2],
  [/seeking alpha/i, -1],
];

// High-impact macro & market keywords. Each match adds points.
const KEYWORDS: Array<[RegExp, number]> = [
  // Central banks / rates
  [/\b(federal reserve|fomc|fed)\b/i, 5],
  [/\bpowell\b/i, 4],
  [/\b(cpi|pce|inflation|deflation)\b/i, 5],
  [/\brate (hike|cut|decision|increase|decrease|hold)\b/i, 5],
  [/\binterest rate\b/i, 4],
  [/\b(monetary policy|hawkish|dovish)\b/i, 3],
  [/\b(ecb|bank of england|boe|bank of japan|boj|rba|rbnz|snb|pboc)\b/i, 3],
  // Jobs / growth
  [/\b(non-?farm payroll|nfp|jobs report|employment|jobless claims|unemployment)\b/i, 5],
  [/\b(gdp|recession|economic growth|hard landing|soft landing)\b/i, 4],
  // Treasuries
  [/\b(treasury|treasuries|bond yield|yield curve|10-?year)\b/i, 3],
  // Politics that move markets
  [/\b(trump|biden|harris)\b/i, 2],
  [/\b(tariff|trade war|sanction|export ban)\b/i, 4],
  [/\b(government shutdown|debt ceiling)\b/i, 4],
  // Earnings
  [/\bearnings (beat|miss|report|surprise)\b/i, 3],
  [/\b(guidance|forecast cut|forecast raise|profit warning)\b/i, 3],
  // Commodities
  [/\b(opec|crude oil|wti|brent|natural gas)\b/i, 4],
  [/\b(gold|silver|copper|platinum|palladium)\b/i, 2],
  // FX
  [/\b(dxy|dollar index|euro|^usd\b|yen|^jpy\b|sterling|^gbp\b)\b/i, 2],
  // Crypto (the user trades crypto, surface it)
  [/\b(bitcoin|btc|ethereum|eth|crypto|spot etf|stablecoin)\b/i, 3],
  // Indices / futures
  [/\b(s&p 500|spx|nasdaq|nas100|dow jones|russell 2000|nikkei|dax|ftse)\b/i, 3],
  [/\b(futures|nq=f|es=f|\/nq|\/es)\b/i, 2],
  // Volatility / risk
  [/\b(vix|volatility|risk-off|risk-on|flight to safety|safe haven)\b/i, 2],
  // Breaking flags
  [/\b(breaking|urgent|alert|exclusive|just in)\b/i, 3],
  // Big-name companies that drag markets
  [/\b(nvidia|apple|microsoft|tesla|meta|amazon|google|alphabet|jpmorgan|goldman)\b/i, 2],
];

// Noise / clickbait penalties.
const NOISE_PATTERNS: Array<[RegExp, number]> = [
  [/best stocks? to (buy|own)/i, -6],
  [/should you (buy|sell|invest)/i, -5],
  [/^\d+ (reasons|stocks|things|ways|tips)/i, -4],
  [/here'?s why/i, -2],
  [/(under|for) \$\d+/i, -2], // "stocks under $5", "for $100"
  [/sponsored|advertorial|press release/i, -5],
  [/horoscope|celebrity|lifestyle|fashion|kardashian/i, -8],
  [/penny stocks?/i, -5],
  [/(top|best) \d+ /i, -2],
  [/will make you rich|millionaire by/i, -8],
  [/(buy|sell)-rated/i, -2],
];

const PRIORITY_HIGH = 8;
const PRIORITY_MEDIUM = 4;
const MIN_KEEP_SCORE = 1;

export function scoreItem(item: RawArticle): ScoredArticle {
  const text = `${item.headline} ${item.summary ?? ""}`;
  let score = 0;

  for (const [re, w] of SOURCE_WEIGHTS) {
    if (re.test(item.source)) score += w;
  }
  for (const [re, w] of KEYWORDS) {
    if (re.test(text)) score += w;
  }
  for (const [re, w] of NOISE_PATTERNS) {
    if (re.test(text)) score += w;
  }

  // Recency bonus: items in the last 2 hours get +2, last 6 hours +1.
  const ageHours = (Date.now() / 1000 - item.datetime) / 3600;
  if (ageHours <= 2) score += 2;
  else if (ageHours <= 6) score += 1;

  const priority: ScoredArticle["priority"] =
    score >= PRIORITY_HIGH ? "high" : score >= PRIORITY_MEDIUM ? "medium" : "low";

  return { ...item, score, priority };
}

export function filterAndSort(items: RawArticle[], keepAll = false): ScoredArticle[] {
  const scored = items.map(scoreItem);
  if (keepAll) {
    return scored.sort((a, b) => b.datetime - a.datetime);
  }
  return scored
    .filter((a) => a.score >= MIN_KEEP_SCORE)
    .sort((a, b) => {
      // Score-first ordering with recency tiebreak.
      if (b.score !== a.score) return b.score - a.score;
      return b.datetime - a.datetime;
    });
}
