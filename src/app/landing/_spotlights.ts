// Plain data + types for the feature spotlights. Lives in a non-"use
// client" module so server pages (e.g. /landing/features) can map over
// SPOTLIGHTS at render time. Importing data from a client module across
// the server/client boundary returns a reference instead of the array,
// which breaks .map() during prerender.

export interface SpotlightDef {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  image: string;
  placeholder: string;
}

export const SPOTLIGHTS: SpotlightDef[] = [
  {
    eyebrow: "Bias & Session Levels",
    title: "Know which way the market's drawing — before you click buy.",
    body: "ICT/SMC bias cards refresh on every candle close across NQ, ES, Gold, BTC and EUR/USD. Session H/L for Asia, London and New York lift onto the dashboard with pivot points calculated, so you stop drawing rectangles by hand at 3am.",
    bullets: [
      "Mode-aware: flip to Crypto and the whole dashboard re-skins.",
      "Pivots, ranges, and live/closed status per session.",
      "Header tells you exactly which session is open, in your time zone.",
    ],
    image: "/landing/sessions.png",
    placeholder: "Asia / London / New York session cards + position calculator",
  },
  {
    eyebrow: "Liquidity Heatmap",
    title: "See where price is being drawn, not just where it is.",
    body: "A live map of buy-side and sell-side liquidity pools tagged by source — PDH, PWL, equal highs, Asia high — sorted by distance and scored by likelihood of being the next sweep.",
    bullets: [
      "Heat colour-coded: red high-prob sweeps stand out instantly.",
      "Filters out tapped levels so the list stays current.",
      "Per-instrument: NAS100, ES, Gold, Oil, BTC, EUR/USD and more.",
    ],
    image: "/landing/liquidity.png",
    placeholder: "NAS100 buy-side / sell-side liquidity pools",
  },
  {
    eyebrow: "Economic Calendar",
    title: "Filter the noise. Trade the events that actually move.",
    body: "Multi-currency macro calendar with daily, weekly and monthly grids. Each event tagged HIGH / MED / LOW impact and Bullish / Bearish / Mixed bias. Side-panel Breaking News is relevance-scored — Reuters/Bloomberg up, listicle farms out.",
    bullets: [
      "10 most-traded currencies pinned to the filter row.",
      "Click a day → see every event with bias and forecast.",
      "Currency selection syncs to the home Next-Event countdown.",
    ],
    image: "/landing/calendar.png",
    placeholder: "Monthly calendar grid with Breaking News sidebar",
  },
  {
    eyebrow: "Market Movers",
    title: "Spot the unusual stuff fast — across every asset class.",
    body: "Today's biggest movers across futures, commodities, crypto and forex in one ranked list. The top mover gets a hero card; the rest fall in by absolute % move. Scrub the date back through the year to study previous big days.",
    bullets: [
      "All / Futures / Commodities / Crypto / Forex tabs.",
      "1-year date scrubber — instant lookup, no extra fetch.",
      "Cached at the edge so 1k users hit upstream as 1.",
    ],
    image: "/landing/movers.png",
    placeholder: "Top mover hero card + ranked list",
  },
  {
    eyebrow: "Seasonality",
    title: "The edge nobody on FinTwit talks about.",
    body: "Average price path through any month for any instrument, layered 15-year, 10-year, 5-year and year-to-date. Hover the chart to read each line's exact percentage at any day. Stats card shows avg return, win rate, best/worst year.",
    bullets: [
      "30+ instruments — futures, commodities, FX, crypto.",
      "Min/max envelope band shows the historical extremes.",
      "Backtest your gut feel before you put real money on it.",
    ],
    image: "/landing/seasonality.png",
    placeholder: "NQ April seasonality chart",
  },
  {
    eyebrow: "Position Calculator",
    title: "Pop it onto your second monitor. Never miss size again.",
    body: "Three inputs — contract, risk amount, stop in points — out comes the size, the dollar risk, and a clean R:R derivation. One-click pop-out lives in its own draggable window beside your charts.",
    bullets: [
      "Single grouped dropdown for every contract you trade.",
      "Mode-aware: only shows the contracts for your active asset class.",
      "Pop-out window survives chart navigation and reloads.",
    ],
    image: "/landing/sessions.png",
    placeholder: "Position calculator + session levels",
  },
  {
    eyebrow: "Journal & Analytics",
    title: "A journal that tells the truth, not the story you wanted.",
    body: "Tap a day to log a trade. Watch the calendar fill in green and red. Weekly totals on the Saturday cell. Flip to yearly view for a 12-month grid. Scroll down for the equity curve, win rate, profit factor, max drawdown, day-of-week breakdown, streaks.",
    bullets: [
      "Monthly + Yearly P/L views with calendar tile colouring.",
      "Per-week summary on every Saturday cell.",
      "Stats update live as you log — no spreadsheet glue.",
    ],
    image: "/landing/journal.png",
    placeholder: "Monthly P&L calendar with green/red cells",
  },
  {
    eyebrow: "Trade Planner",
    title: "Your daily playbook on the same screen as your dashboard.",
    body: "Two columns per plan — Trade Plan on the left, Risk Management on the right. Type the rules you actually follow, read them every morning, edit when something changes. No checkboxes pretending it's a to-do list.",
    bullets: [
      "Numbered text rows, multi-line, auto-expanding.",
      "Per-plan title, multiple plans, sorted by most recent edit.",
      "Synced to your account across every device you sign in on.",
    ],
    image: "/landing/planner.png",
    placeholder: "planner with trade plan + risk management columns",
  },
];
