import type { CalendarEvent } from "@/lib/data";

export type Bias = "bullish" | "bearish" | "neutral" | "mixed";

// What does the event measure? Used to flip the "beat = good" rule for
// indicators where a higher number is actually bad for risk assets
// (inflation, unemployment).
type Kind =
  | "growth" // higher is bullish for equities/USD (GDP, PMI, retail)
  | "inflation" // higher pushes Fed hawkish -> bearish equities
  | "unemployment" // higher is bearish
  | "trade" // higher surplus = bullish USD
  | "rate" // central bank decision — tooltip notes hawkish/dovish
  | "other";

interface Classification {
  kind: Kind;
  // Short description of *what the market watches for* on this release.
  watchFor: string;
}

// Keyword → Kind. Most-specific strings first so "unemployment rate" beats
// "rate decision" etc. Matching is case-insensitive on the event title.
const RULES: Array<{ match: RegExp; kind: Kind; watchFor: string }> = [
  // Rate decisions / Fed policy
  {
    match: /(rate decision|interest rate decision|fed funds|rate statement|monetary policy|fomc)/i,
    kind: "rate",
    watchFor:
      "Hawkish surprise (rates up / tightening) = bearish equities, bullish USD. Dovish = bullish equities, bearish USD.",
  },
  // Unemployment
  {
    match: /(unemployment rate|jobless claims|initial claims|continuing claims)/i,
    kind: "unemployment",
    watchFor:
      "Higher than forecast = weaker jobs market = bearish equities / USD. Lower = bullish.",
  },
  // Inflation family
  {
    match: /\b(cpi|ppi|pce|inflation rate|core inflation)\b/i,
    kind: "inflation",
    watchFor:
      "Hotter than forecast = hawkish Fed = bearish equities, bullish USD short-term. Cooler = bullish equities.",
  },
  // Trade
  {
    match: /(trade balance|current account)/i,
    kind: "trade",
    watchFor:
      "Higher surplus / narrower deficit = bullish USD. Wider deficit = bearish.",
  },
  // Growth-positive basket
  {
    match:
      /(gdp|retail sales|industrial production|durable goods|pmi|ism|employment change|nonfarm|payrolls|consumer confidence|consumer sentiment|housing starts|building permits|pending home sales|new home sales|existing home sales|jolts|construction spending|factory orders|business inventories)/i,
    kind: "growth",
    watchFor:
      "Beat forecast = bullish equities / USD (stronger economy). Miss = bearish.",
  },
];

function classify(event: CalendarEvent): Classification {
  for (const rule of RULES) {
    if (rule.match.test(event.title)) {
      return { kind: rule.kind, watchFor: rule.watchFor };
    }
  }
  return {
    kind: "other",
    watchFor: "Impact on market direction is event-specific.",
  };
}

// Pull a leading numeric prefix out of "3.2%", "-0.5", "250K" etc.
function parseNumeric(v: string | undefined | null): number | null {
  if (!v) return null;
  const m = /^-?\d+(\.\d+)?/.exec(v.trim());
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

export interface EventBias {
  bias: Bias;
  kind: Kind;
  label: string; // short human label e.g. "Bullish (beat forecast)"
  watchFor: string; // always populated
}

export function biasForEvent(event: CalendarEvent): EventBias {
  const c = classify(event);
  const actual = parseNumeric(event.actual);
  const forecast = parseNumeric(event.forecast);

  // No actual yet — event is upcoming.
  if (actual === null || forecast === null) {
    return {
      bias: "neutral",
      kind: c.kind,
      label: "Upcoming — watch actual vs forecast",
      watchFor: c.watchFor,
    };
  }

  const beat = actual > forecast;
  const miss = actual < forecast;
  const flat = !beat && !miss;
  if (flat) {
    return {
      bias: "neutral",
      kind: c.kind,
      label: "Came in line with forecast",
      watchFor: c.watchFor,
    };
  }

  // Directional rules. For "higher is bad" indicators we flip the sign.
  let bullish: boolean;
  switch (c.kind) {
    case "inflation":
    case "unemployment":
      bullish = miss;
      break;
    case "growth":
    case "trade":
      bullish = beat;
      break;
    case "rate":
    case "other":
    default:
      // Can't reliably infer direction without extra context.
      return {
        bias: "neutral",
        kind: c.kind,
        label: beat ? "Beat forecast" : "Missed forecast",
        watchFor: c.watchFor,
      };
  }

  return {
    bias: bullish ? "bullish" : "bearish",
    kind: c.kind,
    label: bullish
      ? beat
        ? "Beat forecast — bullish"
        : "Missed forecast — bullish"
      : beat
      ? "Beat forecast — bearish"
      : "Missed forecast — bearish",
    watchFor: c.watchFor,
  };
}

export interface DaySummary {
  bias: Bias;
  label: string;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
}

export function summarizeDay(events: CalendarEvent[]): DaySummary {
  let bull = 0;
  let bear = 0;
  let neut = 0;
  for (const e of events) {
    // Weight high-impact events 2x so one NFP outvotes several low-impact prints.
    const w = e.impact === "high" ? 2 : e.impact === "medium" ? 1 : 0.5;
    const b = biasForEvent(e).bias;
    if (b === "bullish") bull += w;
    else if (b === "bearish") bear += w;
    else neut += w;
  }

  let bias: Bias;
  let label: string;
  if (bull === 0 && bear === 0) {
    bias = "neutral";
    label = "No directional bias yet";
  } else if (bull > bear * 1.3) {
    bias = "bullish";
    label = "Net bullish tilt";
  } else if (bear > bull * 1.3) {
    bias = "bearish";
    label = "Net bearish tilt";
  } else {
    bias = "mixed";
    label = "Mixed — conflicting signals";
  }

  return {
    bias,
    label,
    bullishCount: Math.round(bull),
    bearishCount: Math.round(bear),
    neutralCount: Math.round(neut),
  };
}
