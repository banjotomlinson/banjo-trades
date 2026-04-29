// Finnhub's economic-calendar feed tags some flagship FOMC-week events as
// medium or low (e.g. Core PCE QoQ Adv, Employment Cost Index, FOMC Press
// Conference variants). Anyone filtering by "high" would miss them, so we
// re-classify by event title against a curated pattern list.

const HIGH_IMPACT_PATTERNS: RegExp[] = [
  // FOMC / Fed
  /\bfomc\b/i,
  /\bfed(eral)?\s+(funds|interest)\s+rate\b/i,
  /\bfed(eral)?\s+(open\s+market\s+committee|press\s+conference)\b/i,
  /\bpowell\b/i,
  // Inflation
  /\bcore\s+pce\b/i,
  /\bpce\s+price/i,
  /\bcore\s+cpi\b/i,
  /\bcpi\b/i,
  // Jobs
  /\bnon[-\s]?farm\s+payrolls?\b/i,
  /\bnfp\b/i,
  /\bunemployment\s+rate\b/i,
  /\bemployment\s+cost\s+index\b/i,
  /\binitial\s+jobless\s+claims\b/i,
  // Growth
  /\bgdp\s+growth\s+rate\b/i,
  /\badvance\s+gdp\b/i,
  /\bgdp\b.*\b(adv|advance|prelim|preliminary|final)/i,
  // Consumer / business
  /\bretail\s+sales\b/i,
  /\bism\s+(manufacturing|services|non[-\s]?manufacturing)\s+pmi\b/i,
  /\bpersonal\s+(income|spending)\b/i,
  /\bconsumer\s+confidence\b/i,
  /\bconsumer\s+sentiment\b/i,
  // Housing
  /\bhousing\s+starts\b/i,
];

export function correctImpact(
  title: string,
  rawImpact: string
): "high" | "medium" | "low" {
  const normalised = (rawImpact || "").toLowerCase();
  if (HIGH_IMPACT_PATTERNS.some((re) => re.test(title))) return "high";
  if (normalised === "high" || normalised === "medium" || normalised === "low") {
    return normalised;
  }
  return "low";
}
