# Banjo Trades -- Migration Plan

Monolithic HTML (6,088 lines) to multi-user Next.js + Supabase SaaS.

**Authors:** Zac + Ryan
**Created:** 2026-04-17
**Status:** Planning

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [Component Breakdown](#3-component-breakdown)
4. [API Routes](#4-api-routes)
5. [Phase 1 -- Free Community Tool](#5-phase-1--free-community-tool)
6. [Phase 2 -- SaaS / Paid Tiers](#6-phase-2--saas--paid-tiers)
7. [Migration Checklist](#7-migration-checklist)
8. [Tech Stack Summary](#8-tech-stack-summary)

---

## 1. Architecture Overview

### High-Level Diagram

```
Browser (Next.js App)
  |
  +-- Static/SSR pages (Vercel Edge)
  +-- Client components (TradingView widgets, real-time UI)
  |
  +-- /api/* (Next.js API Routes -- Vercel Serverless)
  |     |-- /api/quotes      -> Finnhub REST (proxied, key hidden)
  |     |-- /api/calendar     -> Forex Factory + Finnhub (merged, cached)
  |     |-- /api/news         -> Finnhub news (proxied, cached)
  |     |-- /api/bias         -> Compute pre-market bias server-side
  |     |-- /api/scanner      -> ICT signal scanner (server-side compute)
  |     |-- /api/webhooks/stripe -> Phase 2
  |     
  +-- Supabase
        |-- Auth (email/password, Google OAuth)
        |-- PostgreSQL (user data, journal, pools, caches)
        |-- Storage (reference chart images)
        |-- Realtime (live bias votes, shared watchlists)
```

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 14 App Router | Server components for SEO, API routes for key hiding, incremental adoption |
| Auth | Supabase Auth | Free tier generous, built-in RLS, no custom auth code |
| Database | Supabase PostgreSQL | Same project as auth, free tier = 500MB, RLS built-in |
| File storage | Supabase Storage | Replaces localStorage gallery, 1GB free, signed URLs |
| Deployment | Vercel | Native Next.js support, edge functions, free hobby tier |
| Styling | Tailwind CSS | Matches existing utility-class-like inline styles, dark mode built in |
| Charts (financial) | TradingView widgets (embed) | Already working, free, no data licensing needed |
| Charts (custom) | lightweight-charts (already imported) | For DoL charts, P&L visualisations |
| Real-time data | Finnhub REST via API routes | Keep free tier, server-side caching reduces rate limit pressure |
| State management | React Context + SWR | SWR for data fetching with stale-while-revalidate, Context for user prefs |
| API key strategy | All third-party keys server-side only | Finnhub key currently exposed client-side. Move to env vars on Vercel |

### Server vs Client Component Strategy

| Layer | Rendering | Why |
|-------|-----------|-----|
| Layout shell, header, sidebar | Server Component | Static structure, no interactivity |
| Auth gates, user profile | Server Component | Reads session cookie server-side |
| TradingView embeds | Client Component (`"use client"`) | iframe + postMessage requires DOM |
| Economic Calendar | Client Component | Real-time countdown, filter toggles, polling |
| Breaking News | Client Component | Polling, desktop notifications API |
| Pre-Market Bias | Client Component | 60s auto-refresh, live quotes |
| Markets Snapshot | Client Component | 60s polling, hover tooltips |
| Liquidity Heatmap | Client Component | Instrument dropdown, interactive rows |
| Reference Gallery | Client Component | Drag-drop upload, lightbox |
| Market Clocks | Client Component | 1s tick interval |
| P&L Journal | Client Component | Inline editing, localStorage -> DB sync |
| Signal Scanner | Client Component | Heavy compute, async results |
| Theme Customiser | Client Component | CSS variable manipulation, localStorage |

---

## 2. Database Schema

### 2.1 `profiles`

Extends Supabase `auth.users`. Created automatically via trigger on signup.

```sql
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  avatar_url    TEXT,
  timezone      TEXT NOT NULL DEFAULT 'Australia/Sydney',
  default_left_chart   TEXT NOT NULL DEFAULT 'PEPPERSTONE:NAS100',
  default_right_chart  TEXT NOT NULL DEFAULT 'FOREXCOM:SPXUSD',
  theme_preset  TEXT NOT NULL DEFAULT 'default',
  theme_custom  JSONB,  -- custom colour overrides, mirrors current banjoTheme localStorage
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users can read/update only their own row
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile"  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
```

### 2.2 `user_watchlists`

Which instruments a user tracks in the Markets Snapshot and chart selectors.

```sql
CREATE TABLE public.user_watchlists (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol        TEXT NOT NULL,         -- e.g. 'PEPPERSTONE:NAS100'
  display_name  TEXT NOT NULL,         -- e.g. 'NAS100'
  category      TEXT NOT NULL,         -- 'Index Futures', 'Commodities', 'Forex', 'Crypto'
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- RLS: users manage only their own watchlist
ALTER TABLE public.user_watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own watchlist" ON public.user_watchlists
  FOR ALL USING (auth.uid() = user_id);
```

### 2.3 `liquidity_pools`

User-submitted or system-generated liquidity pool levels. Replaces the hardcoded data in the current HTML.

```sql
CREATE TABLE public.liquidity_pools (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instrument      TEXT NOT NULL,       -- 'NAS100', 'SPX'
  pool_type       TEXT NOT NULL,       -- 'PDH','PDL','ASIA_H','ASIA_L','LONDON_H','LONDON_L','EQH','EQL','PWH','PWL','CUSTOM'
  label           TEXT NOT NULL,       -- display label
  price           NUMERIC(12,2) NOT NULL,
  side            TEXT NOT NULL CHECK (side IN ('above','below')),
  sweep_prob      TEXT CHECK (sweep_prob IN ('high','medium','magnet','low')),
  is_tapped       BOOLEAN NOT NULL DEFAULT FALSE,
  session_date    DATE NOT NULL,       -- which trading session this belongs to
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users see own pools + system-generated pools (user_id = service role UUID)
ALTER TABLE public.liquidity_pools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pools" ON public.liquidity_pools
  FOR ALL USING (auth.uid() = user_id);
```

### 2.4 `reference_charts`

Replaces localStorage gallery. Actual images go to Supabase Storage bucket `reference-charts`.

```sql
CREATE TABLE public.reference_charts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instrument    TEXT NOT NULL,         -- 'NAS100', 'SPX', 'ALL'
  storage_path  TEXT NOT NULL,         -- path in Supabase Storage bucket
  file_name     TEXT NOT NULL,
  file_size     INT,                   -- bytes
  mime_type     TEXT,
  caption       TEXT,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users manage own charts
ALTER TABLE public.reference_charts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own charts" ON public.reference_charts
  FOR ALL USING (auth.uid() = user_id);
```

Supabase Storage bucket:
```
reference-charts/
  {user_id}/
    {uuid}.{ext}
```

Storage policy: authenticated users can upload/read/delete within their own `{user_id}/` prefix.

### 2.5 `trade_journal`

P&L journal. Replaces localStorage `banjo_pnl_v1` and `banjo_pnl_notes_v1`.

```sql
CREATE TABLE public.trade_journal (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trade_date    DATE NOT NULL,
  pnl_amount    NUMERIC(10,2),         -- positive = profit, negative = loss
  pnl_text      TEXT,                   -- raw text the user typed (e.g. "+$250")
  notes         TEXT,                   -- session notes
  instrument    TEXT,                   -- 'NAS100', 'SPX', etc.
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, trade_date)
);

-- RLS
ALTER TABLE public.trade_journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journal" ON public.trade_journal
  FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_journal_user_date ON public.trade_journal(user_id, trade_date);
```

### 2.6 `economic_events_cache`

Server-side cache of merged Forex Factory + Finnhub calendar data. Shared across all users. Refreshed by API route.

```sql
CREATE TABLE public.economic_events_cache (
  id            BIGSERIAL PRIMARY KEY,
  event_date    DATE NOT NULL,
  event_time    TEXT,                   -- 'HH:MM' in ET, or 'All Day', or 'Tentative'
  currency      TEXT NOT NULL,          -- 'USD', 'EUR', etc.
  impact        TEXT NOT NULL,          -- 'high', 'medium', 'low'
  event_name    TEXT NOT NULL,
  forecast      TEXT,
  previous      TEXT,
  actual        TEXT,
  source        TEXT NOT NULL,          -- 'forexfactory', 'finnhub', 'merged'
  dedup_key     TEXT NOT NULL UNIQUE,   -- hash of date+time+currency+event_name for dedup
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No RLS needed -- all users read, only server writes
ALTER TABLE public.economic_events_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read events" ON public.economic_events_cache
  FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_events_date ON public.economic_events_cache(event_date);
CREATE INDEX idx_events_impact ON public.economic_events_cache(impact);
```

### 2.7 `news_cache`

Server-side cache of Finnhub news. Shared across all users.

```sql
CREATE TABLE public.news_cache (
  id            BIGSERIAL PRIMARY KEY,
  headline      TEXT NOT NULL,
  summary       TEXT,
  source        TEXT,
  url           TEXT NOT NULL,
  image_url     TEXT,
  published_at  TIMESTAMPTZ NOT NULL,
  category      TEXT,                   -- 'general', 'forex', 'crypto', etc.
  is_hot        BOOLEAN NOT NULL DEFAULT FALSE,  -- matched hot keywords
  finnhub_id    BIGINT UNIQUE,          -- Finnhub's own ID for dedup
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.news_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read news" ON public.news_cache
  FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_news_published ON public.news_cache(published_at DESC);
```

### 2.8 `subscriptions` (Phase 2)

Stripe subscription tracking.

```sql
CREATE TABLE public.subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id    TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  plan_id           TEXT NOT NULL,       -- 'free', 'pro', 'team'
  status            TEXT NOT NULL DEFAULT 'active',  -- 'active','past_due','canceled','trialing'
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  cancel_at_period_end  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_subs_user ON public.subscriptions(user_id);
CREATE INDEX idx_subs_stripe ON public.subscriptions(stripe_customer_id);
```

### 2.9 `bias_votes` (Community feature)

Users can submit their session bias, aggregated into community consensus.

```sql
CREATE TABLE public.bias_votes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instrument    TEXT NOT NULL,          -- 'NAS100', 'SPX'
  session_date  DATE NOT NULL,
  bias          TEXT NOT NULL CHECK (bias IN ('LONG','SHORT','NEUTRAL')),
  confidence    TEXT CHECK (confidence IN ('high','medium','low')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, instrument, session_date)
);

ALTER TABLE public.bias_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own votes" ON public.bias_votes
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users read all votes" ON public.bias_votes
  FOR SELECT TO authenticated USING (true);
```

### Auto-create profile trigger

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, timezone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'Australia/Sydney'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 3. Component Breakdown

### File Structure

```
src/
  app/
    layout.tsx                  -- Root layout (dark theme, fonts, Supabase provider)
    page.tsx                    -- Dashboard (main view, server component shell)
    login/page.tsx              -- Auth: login
    register/page.tsx           -- Auth: register
    profile/page.tsx            -- User settings (timezone, charts, theme)
    journal/page.tsx            -- P&L journal full view
    api/
      quotes/route.ts           -- Proxy Finnhub quotes
      calendar/route.ts         -- Merge FF + Finnhub, cache in DB
      news/route.ts             -- Proxy Finnhub news, cache in DB
      bias/route.ts             -- Compute pre-market bias
      scanner/route.ts          -- ICT signal scanner
      webhooks/
        stripe/route.ts         -- Phase 2
  components/
    layout/
      Header.tsx                -- Logo, timezone selector, theme button, user menu
      StatusBar.tsx             -- Last updated, refresh button, connection status
    auth/
      LoginForm.tsx
      RegisterForm.tsx
      UserMenu.tsx              -- Avatar dropdown with logout, profile link
      AuthProvider.tsx           -- Supabase auth context
    charts/
      TradingViewChart.tsx      -- Reusable TradingView widget embed
      ChartPair.tsx             -- Side-by-side chart layout with instrument selectors
      FullscreenOverlay.tsx     -- Fullscreen chart overlay
      DoLCharts.tsx             -- Draws on Liquidity charts (lightweight-charts)
    market/
      MarketClocks.tsx          -- Multi-timezone clocks with session status strip
      PreMarketBias.tsx         -- Bias card with confidence, pivot levels, live quotes
      MarketsSnapshot.tsx       -- Grid of 4 bias cards with ICT scoring
      SessionLevels.tsx         -- Asia/London/NY session high/low cards
    calendar/
      EconomicCalendar.tsx      -- Main calendar wrapper
      CalendarDaily.tsx         -- Daily table view
      CalendarWeekly.tsx        -- Weekly table view
      CalendarMonthly.tsx       -- Monthly grid view
      CountdownBar.tsx          -- Next high-impact event countdown
      ImpactFilters.tsx         -- High/Medium/Low toggle pills
      CurrencyFilters.tsx       -- Currency filter bar
    news/
      BreakingNews.tsx          -- News feed panel
      NewsItem.tsx              -- Individual news item
    liquidity/
      LiquidityHeatmap.tsx      -- Pool heatmap with BSL/SSL columns
      LiquidityRow.tsx          -- Individual pool row with tooltip
      ReferenceGallery.tsx      -- Drag-drop image gallery with lightbox
    scanner/
      SignalScanner.tsx         -- Scanner wrapper (collapsible)
      ScannerControls.tsx       -- Category tabs, instrument select, timeframe tabs
      SetupCard.tsx             -- Individual setup result card
    journal/
      PnLCalendar.tsx           -- Monthly P&L calendar grid
      PnLCell.tsx               -- Individual day cell with inline editing
      PnLSummary.tsx            -- Monthly stats bar
    social/
      SocialFeed.tsx            -- X/Twitter feed section (collapsible)
      SocialPanel.tsx           -- Individual handle panel
    theme/
      ThemeCustomiser.tsx       -- Slide-out theme panel
      ThemeProvider.tsx         -- CSS variable context + persistence
  hooks/
    usePolling.ts               -- Generic SWR-based polling hook
    useSupabase.ts              -- Supabase client hook
    useUser.ts                  -- Current user hook
    useTheme.ts                 -- Theme state hook
    useDesktopNotifications.ts  -- Browser notification permission + dispatch
    useTimezone.ts              -- User timezone formatting utilities
  lib/
    supabase/
      client.ts                 -- Browser Supabase client
      server.ts                 -- Server-side Supabase client (for API routes)
      middleware.ts             -- Auth middleware for protected routes
    finnhub.ts                  -- Finnhub API wrapper (server-side only)
    forexfactory.ts             -- Forex Factory fetcher + parser
    bias-engine.ts              -- Pre-market bias computation logic
    ict-scanner.ts              -- ICT analysis engine (port from lines 4789-5370)
    calendar-merger.ts          -- Merge + dedupe FF and Finnhub events
    constants.ts                -- INSTRUMENTS array, session times, poll intervals
    utils.ts                    -- formatPnL, getTimeAgo, fmtCountdown, etc.
  types/
    index.ts                    -- TypeScript interfaces for all domain objects
```

### Component Mapping (HTML section to React component)

| HTML Section (current) | Lines | React Component | Notes |
|------------------------|-------|----------------|-------|
| Header + date label | 1312-1326 | `Header.tsx` | Add user menu, move TZ to profile |
| Market Clock bar | 1328-1382 | `MarketClocks.tsx` | Keep 1s polling, add user TZ from profile |
| Theme customiser panel | 1384-1524 | `ThemeCustomiser.tsx` | Persist to `profiles.theme_custom` |
| TradingView charts | 1526-1544 | `ChartPair.tsx` + `TradingViewChart.tsx` | Instrument selection from watchlist |
| Fullscreen chart overlay | 1540-1544 | `FullscreenOverlay.tsx` | Portal-based overlay |
| Instrument selector JS | 1546-1654 | Part of `ChartPair.tsx` | INSTRUMENTS array to `constants.ts` |
| Pre-market bias | 2700-3060 | `PreMarketBias.tsx` | Bias engine moves server-side |
| Markets snapshot | 3359-3700 | `MarketsSnapshot.tsx` | ICT scoring moves to API route |
| Session H/L cards | 3839-4160 | `SessionLevels.tsx` | Yahoo Finance proxy through API route |
| Economic calendar | 2184-2520 | `EconomicCalendar.tsx` + sub-components | Data fetching to API route |
| Countdown bar | 2522-2565 | `CountdownBar.tsx` | Client-side countdown from cached data |
| Breaking news | 2568-2650 | `BreakingNews.tsx` | Polling via API route |
| Liquidity heatmap (new) | 5812-6085 | `LiquidityHeatmap.tsx` | Data from DB instead of hardcoded |
| Reference gallery | 5972-6085 | `ReferenceGallery.tsx` | Supabase Storage replaces localStorage |
| P&L journal | 4314-4530 | `PnLCalendar.tsx` | Supabase DB replaces localStorage |
| Signal scanner | 4700-5800 | `SignalScanner.tsx` | Heavy compute to API route/worker |
| DoL charts | 3928-4032 | `DoLCharts.tsx` | Yahoo proxy through API route |
| Social feed | 3737-3838 | `SocialFeed.tsx` | Keep localStorage for handle list |
| Theme presets/accordion | 4164-4310 | `ThemeCustomiser.tsx` | CSS variables, persist to DB |
| Status bar | bottom | `StatusBar.tsx` | Connection/refresh status |

---

## 4. API Routes

### `/api/quotes` -- Proxy Finnhub Quotes

```
GET /api/quotes?symbols=QQQ,SPY

Response: {
  QQQ: { c: 450.23, dp: 1.2, d: 5.33, pc: 444.90 },
  SPY: { c: 520.10, dp: 0.8, d: 4.12, pc: 515.98 }
}

Cache: 15s in-memory (Vercel edge cache or Map)
Auth: Required (Supabase session cookie)
```

### `/api/calendar` -- Economic Calendar

```
GET /api/calendar?start=2026-04-17&end=2026-04-23

Response: {
  events: [
    {
      id: "abc123",
      date: "2026-04-17",
      time: "08:30",
      currency: "USD",
      impact: "high",
      event: "Initial Jobless Claims",
      forecast: "215K",
      previous: "211K",
      actual: null,
      source: "merged"
    }
  ],
  nextHighImpact: {
    event: "Non-Farm Payrolls",
    datetime: "2026-04-18T12:30:00Z",
    secondsUntil: 86400
  }
}

Cache: DB cache table, refresh every 5 minutes via server-side logic
Auth: Required
```

### `/api/news` -- Breaking News

```
GET /api/news?limit=50

Response: {
  articles: [
    {
      id: 123456,
      headline: "Fed Signals Rate Decision",
      summary: "...",
      source: "Reuters",
      url: "https://...",
      publishedAt: "2026-04-17T14:30:00Z",
      isHot: true,
      isNew: true
    }
  ]
}

Cache: DB cache, refresh every 60s
Auth: Required
```

### `/api/bias` -- Pre-Market Bias Computation

```
GET /api/bias?instruments=NAS100,SPX

Response: {
  NAS100: {
    bias: "LONG",
    confidence: "high",
    confidenceScore: 78,
    reasons: [
      { text: "Futures +0.45% pre-market", sentiment: "bull" },
      { text: "Above previous close", sentiment: "bull" },
      { text: "No high-impact events before open", sentiment: "bull" }
    ],
    pivots: { r2: 18500, r1: 18350, pivot: 18200, s1: 18050, s2: 17900 },
    quotes: { symbol: "QQQ", price: 450.23, change: 1.2 }
  }
}

Cache: 60s server-side
Auth: Required
```

### `/api/scanner` -- ICT Signal Scanner

```
POST /api/scanner
Body: {
  instrument: "NAS100",
  category: "ict",
  timeframe: "15m"
}

Response: {
  setups: [
    {
      direction: "LONG",
      instrument: "NAS100",
      timeframe: "15m",
      status: "active",
      entry: 18250.50,
      stopLoss: 18200.00,
      takeProfit: 18350.00,
      riskReward: "2.0:1",
      confidence: { score: 72, level: "high", reason: "FVG + OB confluence" },
      tags: ["fvg", "ob", "bos"],
      htfContext: { bias: "bullish", structure: "bullish" }
    }
  ]
}

Compute: Heavy -- port lines 4789-5584 from HTML to lib/ict-scanner.ts
Auth: Required
Phase 2: rate-limited for free tier (5 scans/day), unlimited for Pro
```

### `/api/webhooks/stripe` (Phase 2)

```
POST /api/webhooks/stripe
Body: Stripe webhook event

Handles:
- checkout.session.completed -> create/update subscription
- customer.subscription.updated -> update status
- customer.subscription.deleted -> mark canceled
- invoice.payment_failed -> mark past_due
```

---

## 5. Phase 1 -- Free Community Tool

### Build Order

Each step is a deployable increment. Ship after each step.

#### Step 1: Project Scaffolding (Day 1)

- [ ] `npx create-next-app@latest banjo-trades --typescript --tailwind --app --src-dir`
- [ ] Configure `tailwind.config.ts` with the dark colour palette from current HTML (`#0a0e17` bg, `#111827` panels, `#1e293b` borders, `#3b82f6` accent)
- [ ] Create Supabase project (free tier)
- [ ] Install dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `swr`
- [ ] Set up env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FINNHUB_API_KEY`
- [ ] Create `lib/supabase/client.ts` and `lib/supabase/server.ts`
- [ ] Deploy to Vercel (empty shell)
- [ ] Configure custom domain if ready

#### Step 2: Auth (Day 2)

- [ ] Run SQL migrations for `profiles` table + trigger
- [ ] Build `LoginForm.tsx` and `RegisterForm.tsx` (email/password)
- [ ] Enable Google OAuth in Supabase dashboard
- [ ] Build `AuthProvider.tsx` context wrapper
- [ ] Build `UserMenu.tsx` (avatar, logout)
- [ ] Add Supabase auth middleware for protected routes
- [ ] Test: signup, login, logout, Google OAuth, profile auto-creation

#### Step 3: Layout + Market Clocks (Day 3)

- [ ] Build root `layout.tsx` with dark theme globals
- [ ] Build `Header.tsx` (logo, user menu)
- [ ] Port `MarketClocks.tsx` from lines 4531-4700 (timezone clocks + session status strip)
- [ ] Port timezone utilities (`fmtClockTime`, `getTZAbbr`, `getSessionCountdown`) to `lib/utils.ts`
- [ ] Wire timezone to user profile (read from `profiles.timezone`)
- [ ] Build `StatusBar.tsx`

#### Step 4: Charts (Day 4)

- [ ] Build `TradingViewChart.tsx` -- reusable TradingView widget component
- [ ] Build `ChartPair.tsx` -- side-by-side layout with instrument dropdown
- [ ] Port INSTRUMENTS array (lines 1551-1650) to `lib/constants.ts`
- [ ] Build `FullscreenOverlay.tsx` (portal-based)
- [ ] Wire default instruments to user profile

#### Step 5: Economic Calendar (Days 5-6)

- [ ] Run SQL migration for `economic_events_cache` table
- [ ] Port `forexfactory.ts` fetcher (Forex Factory faireconomy mirror)
- [ ] Port `calendar-merger.ts` (merge + dedupe logic from lines 2219-2280)
- [ ] Build `/api/calendar` route with DB caching
- [ ] Build `EconomicCalendar.tsx` wrapper with Daily/Weekly/Monthly tabs
- [ ] Build `CalendarDaily.tsx` (table view with impact badges, currency badges)
- [ ] Build `CalendarWeekly.tsx`
- [ ] Build `CalendarMonthly.tsx` (grid with colour-coded dots)
- [ ] Build `ImpactFilters.tsx` and `CurrencyFilters.tsx`
- [ ] Build `CountdownBar.tsx` (next high-impact USD event)
- [ ] Set up SWR polling (5 min refresh)

#### Step 6: Breaking News (Day 7)

- [ ] Run SQL migration for `news_cache` table
- [ ] Build `/api/news` route with DB caching + hot keyword detection
- [ ] Port hot keywords list: `NASDAQ`, `S&P`, `Fed`, `rate`, `inflation`, `GDP`, etc.
- [ ] Build `BreakingNews.tsx` with polling
- [ ] Build `NewsItem.tsx` with source badges, NEW badges, time-ago
- [ ] Port `useDesktopNotifications.ts` hook for hot story alerts

#### Step 7: Pre-Market Bias (Days 8-9)

- [ ] Build `/api/quotes` route (Finnhub proxy)
- [ ] Port bias computation engine (lines 2916-3060) to `lib/bias-engine.ts`
- [ ] Build `/api/bias` route
- [ ] Build `PreMarketBias.tsx` (bias card, confidence badge, pivot levels, live quotes, info tooltip)
- [ ] Port `scoreICT` function for multi-factor bias scoring
- [ ] SWR polling every 60s

#### Step 8: Markets Snapshot (Day 10)

- [ ] Port ICT candle scoring (lines 3374-3450) to server-side
- [ ] Extend `/api/bias` to support multiple instruments
- [ ] Build `MarketsSnapshot.tsx` (4-card grid with bias, confidence, hover tooltips)
- [ ] SWR polling

#### Step 9: Session Levels (Day 11)

- [ ] Build Yahoo Finance proxy into `/api/quotes` (or separate `/api/session-levels`)
- [ ] Port session H/L logic (lines 4033-4160) to server-side
- [ ] Build `SessionLevels.tsx` (Asia/London/NY cards with toggle bar)
- [ ] Port session time boundaries to `lib/constants.ts`

#### Step 10: Liquidity Heatmap + Gallery (Days 12-13)

- [ ] Run SQL migrations for `liquidity_pools` and `reference_charts` tables
- [ ] Create Supabase Storage bucket `reference-charts` with user-scoped policies
- [ ] Port liquidity pool logic (lines 5812-5970) to `LiquidityHeatmap.tsx`
- [ ] Build `LiquidityRow.tsx` with sweep probability dots and tooltips
- [ ] Build `ReferenceGallery.tsx` with drag-drop upload to Supabase Storage
- [ ] Build lightbox component
- [ ] Migrate: on first login, offer to import localStorage gallery to Supabase

#### Step 11: P&L Journal (Days 14-15)

- [ ] Run SQL migration for `trade_journal` table
- [ ] Build `PnLCalendar.tsx` (monthly grid)
- [ ] Build `PnLCell.tsx` (inline editing, auto-save to Supabase)
- [ ] Build `PnLSummary.tsx` (monthly stats: total P&L, win rate, avg win/loss, best/worst)
- [ ] Port P&L parsing logic (lines 4322-4340) to `lib/utils.ts`
- [ ] Migrate: on first login, offer to import localStorage P&L data

#### Step 12: DoL Charts (Day 16)

- [ ] Port `renderDoLChart` (lines 3970-4032) using lightweight-charts
- [ ] Build `DoLCharts.tsx` with timeframe tabs (Daily/Weekly/Monthly)
- [ ] Proxy Yahoo data through API route

#### Step 13: Signal Scanner (Days 17-18)

- [ ] Port ICT analysis engine (lines 4789-5600) to `lib/ict-scanner.ts`:
  - `findSwings`, `detectStructure`, `findFVGs`, `findOrderBlocks`
  - `findEqualLevels`, `findBOS`, `findCHoCH`, `findMSS`
  - `findDisplacement`, `findLiquidityVoids`, `findBreakerBlocks`
  - `findInducement`, `findTurtleSoup`, `getPremiumDiscount`
  - `buildSetups`, `generateMTFSetups`, `getSetupConfidence`
- [ ] Build `/api/scanner` route
- [ ] Build `SignalScanner.tsx` (collapsible wrapper)
- [ ] Build `ScannerControls.tsx` (category tabs, instrument dropdown, TF tabs, scan button)
- [ ] Build `SetupCard.tsx` (direction badge, levels, R:R, confidence bar, tags)

#### Step 14: Theme Customiser (Day 19)

- [ ] Build `ThemeProvider.tsx` using CSS custom properties
- [ ] Port 8 presets (default, midnight, ocean, ember, matrix, purple, nord, light) to config
- [ ] Build `ThemeCustomiser.tsx` (slide-out panel with preset swatches + accordion colour pickers)
- [ ] Persist to `profiles.theme_custom` via Supabase
- [ ] Apply on page load from profile data

#### Step 15: Social Feed (Day 19)

- [ ] Port `SocialFeed.tsx` (collapsible section with handle management)
- [ ] Keep localStorage for handle list (low priority for DB migration)
- [ ] Embed X/Twitter timeline widgets

#### Step 16: User Preferences (Day 20)

- [ ] Build profile settings page (`/profile`)
- [ ] Timezone selector (port from lines 4531-4560)
- [ ] Default chart instruments
- [ ] Watchlist management (add/remove/reorder instruments)
- [ ] Theme selection

#### Step 17: Community Features (Days 21-22)

- [ ] Run SQL migration for `bias_votes` table
- [ ] Build bias voting UI (users submit their bias before market open)
- [ ] Build community consensus display (aggregate votes)
- [ ] Shared watchlists (optional, read-only public lists)
- [ ] Supabase Realtime subscription for live vote updates

#### Step 18: Polish + Launch (Days 23-25)

- [ ] Responsive design audit (port all `@media` breakpoints)
- [ ] Loading states and skeleton screens
- [ ] Error boundaries
- [ ] SEO metadata
- [ ] Landing page (unauthenticated users see feature overview + signup CTA)
- [ ] Mobile-friendly navigation
- [ ] Performance audit (bundle size, lazy loading heavy components)
- [ ] Production Supabase environment
- [ ] Custom domain + SSL

---

## 6. Phase 2 -- SaaS / Paid Tiers

### Pricing Structure

| Feature | Free | Pro ($19/mo) | Team ($49/mo) |
|---------|------|-------------|---------------|
| Dashboard (charts, clocks, calendar, news) | Yes | Yes | Yes |
| Pre-market bias (system-computed) | Yes | Yes | Yes |
| Markets snapshot | 2 instruments | All instruments | All instruments |
| Economic calendar | Daily view only | Daily + Weekly + Monthly | All views |
| Breaking news | 25 articles | Unlimited | Unlimited |
| Signal scanner | 3 scans/day | Unlimited | Unlimited |
| Liquidity heatmap | View only | Full (add custom levels) | Full |
| Reference gallery | 5 images | 50 images | 200 images |
| Trade journal | Current month | Full history + export | Full history + export + team |
| Theme customiser | 3 presets | All presets + custom | All + team themes |
| Community bias votes | Yes | Yes | Yes |
| Desktop notifications | Basic | Priority (hot stories first) | Priority |
| Custom alerts | No | Email + browser | Email + browser + webhook |
| Data refresh rate | 120s | 30s | 15s |
| API access | No | No | REST API |
| Team workspaces | No | No | Yes (up to 10 members) |
| Priority support | No | Email | Email + Discord |

### Stripe Integration Plan

1. **Products/Prices** -- Create in Stripe Dashboard:
   - Product: "Banjo Trades Pro" -- Price: $19/month (AUD)
   - Product: "Banjo Trades Team" -- Price: $49/month (AUD)
   - Both with 7-day free trial

2. **Checkout Flow:**
   - User clicks "Upgrade" in app
   - Redirect to Stripe Checkout (hosted)
   - On success, Stripe webhook fires `checkout.session.completed`
   - API route creates/updates `subscriptions` row
   - User redirected back to dashboard with Pro features unlocked

3. **Feature Gating:**
   ```typescript
   // lib/subscription.ts
   export function getUserPlan(userId: string): Promise<'free' | 'pro' | 'team'> {
     // Query subscriptions table, check status === 'active'
     // Default to 'free' if no active subscription
   }

   export function canAccess(plan: string, feature: string): boolean {
     const gates: Record<string, string[]> = {
       'scanner_unlimited': ['pro', 'team'],
       'journal_history': ['pro', 'team'],
       'custom_alerts': ['pro', 'team'],
       'team_workspace': ['team'],
       'api_access': ['team'],
     };
     return gates[feature]?.includes(plan) ?? true;
   }
   ```

4. **Webhook Handler:** `/api/webhooks/stripe` handles lifecycle events (created, updated, deleted, payment_failed).

5. **Customer Portal:** Link to Stripe Customer Portal for subscription management (cancel, update payment method).

### Feature Gating Approach

Use a React context that exposes the current plan:

```typescript
// components/PlanGate.tsx
export function PlanGate({ 
  requires, 
  fallback, 
  children 
}: { 
  requires: string; 
  fallback?: React.ReactNode; 
  children: React.ReactNode;
}) {
  const { plan } = usePlan();
  if (!canAccess(plan, requires)) {
    return fallback ?? <UpgradePrompt feature={requires} />;
  }
  return children;
}
```

Usage:
```tsx
<PlanGate requires="scanner_unlimited" fallback={<ScanLimitReached />}>
  <SignalScanner />
</PlanGate>
```

---

## 7. Migration Checklist

Feature-by-feature checklist to ensure nothing from the 6,088-line HTML is lost.

### Data Migration (localStorage to Supabase)

- [ ] **Theme settings** (`banjoTheme` localStorage key) -- migrate to `profiles.theme_custom` on first authenticated session
- [ ] **Timezone** (`banjoTZ` localStorage key) -- migrate to `profiles.timezone`
- [ ] **P&L data** (`banjo_pnl_v1` localStorage key) -- offer one-click import to `trade_journal` table
- [ ] **P&L notes** (`banjo_pnl_notes_v1` localStorage key) -- merge into `trade_journal.notes` on import
- [ ] **Reference chart images** (localStorage base64 data) -- re-upload to Supabase Storage on import
- [ ] **Social handles** (`banjo_handles` localStorage key) -- keep localStorage (low priority)

### Feature Parity Verification

| # | Feature | Current Source | Target | Verified |
|---|---------|---------------|--------|----------|
| 1 | TradingView chart embeds (NAS100 + SPX) | iframe widgets | `TradingViewChart.tsx` | [ ] |
| 2 | Chart instrument selector (30+ instruments across 4 categories) | JS INSTRUMENTS array | `constants.ts` + `ChartPair.tsx` | [ ] |
| 3 | Per-chart fullscreen mode | DOM manipulation | `FullscreenOverlay.tsx` (portal) | [ ] |
| 4 | Chart interval selector (1m to 1M) | Widget config | `TradingViewChart.tsx` props | [ ] |
| 5 | Pre-market bias (LONG/SHORT/NEUTRAL) | Client-side compute | `/api/bias` + `PreMarketBias.tsx` | [ ] |
| 6 | Bias confidence score + badge | Client-side | Server-side | [ ] |
| 7 | Bias reasoning bullets with sentiment dots | Client-side | Server-side + UI | [ ] |
| 8 | Bias info tooltip | Hover tooltip | Same (React) | [ ] |
| 9 | Loading bar on bias card | CSS animation | Same (Tailwind) | [ ] |
| 10 | Market status badge (PRE-MARKET/OPEN/etc.) | Client-side time check | Same logic | [ ] |
| 11 | Live QQQ + SPY quotes | Direct Finnhub fetch | `/api/quotes` proxy | [ ] |
| 12 | Classic pivot points (R2/R1/Pivot/S1/S2) | Client-side calc | Server-side | [ ] |
| 13 | Markets Snapshot (4 bias cards grid) | Client-side ICT scoring | Server-side scoring | [ ] |
| 14 | Snapshot hover tooltips (ICT confluence details) | DOM tooltip | React tooltip | [ ] |
| 15 | Economic Calendar -- Daily view | Client-side render | `CalendarDaily.tsx` | [ ] |
| 16 | Economic Calendar -- Weekly view | Client-side render | `CalendarWeekly.tsx` | [ ] |
| 17 | Economic Calendar -- Monthly grid | Client-side render | `CalendarMonthly.tsx` | [ ] |
| 18 | Calendar navigation (prev/next/today) | DOM state | React state | [ ] |
| 19 | Impact filter pills (High/Med/Low/All) with counts | DOM toggles | `ImpactFilters.tsx` | [ ] |
| 20 | Currency filter bar (USD/EUR/GBP/JPY/AUD/NZD/CAD/CHF/CNY/ALL) | DOM toggles | `CurrencyFilters.tsx` | [ ] |
| 21 | Currency badges on calendar rows | CSS classes | Tailwind classes | [ ] |
| 22 | Countdown to next high-impact USD event | Client-side timer | `CountdownBar.tsx` | [ ] |
| 23 | Monthly view -- click day to drill into daily | DOM event | React routing/state | [ ] |
| 24 | Day header rows with date grouping | Table render | Same in React | [ ] |
| 25 | Past events greyed out | CSS `.past` class | Conditional Tailwind | [ ] |
| 26 | Today marker (blue left border) | CSS `.today-marker` | Conditional Tailwind | [ ] |
| 27 | Data merge: Forex Factory + Finnhub dedup | Client-side | Server-side `calendar-merger.ts` | [ ] |
| 28 | Breaking News feed | Finnhub polling | `/api/news` + `BreakingNews.tsx` | [ ] |
| 29 | News source badges | CSS | Tailwind | [ ] |
| 30 | NEW badge on fresh articles | Age check | Same logic | [ ] |
| 31 | Desktop notifications for hot stories | Notification API | `useDesktopNotifications.ts` | [ ] |
| 32 | Hot keyword matching (NASDAQ/S&P/Fed/etc.) | Client-side | Server-side (flag in DB) | [ ] |
| 33 | Liquidity Pool Heatmap (BSL/SSL columns) | Hardcoded data | DB + `LiquidityHeatmap.tsx` | [ ] |
| 34 | Pool rows with tag, price, distance, heat bar | DOM render | `LiquidityRow.tsx` | [ ] |
| 35 | Pool tooltips (reasons) | DOM tooltip | React tooltip | [ ] |
| 36 | Instrument dropdown (NAS100/SPX/ES/BTC) | DOM dropdown | React dropdown | [ ] |
| 37 | Reference chart gallery -- drag-drop upload | localStorage + DOM | Supabase Storage + React | [ ] |
| 38 | Gallery thumbnails with remove button | DOM | `ReferenceGallery.tsx` | [ ] |
| 39 | Gallery lightbox | DOM overlay | React modal | [ ] |
| 40 | Gallery 10-image limit, 2MB max per image | Client-side validation | Same + server-side | [ ] |
| 41 | Market Clocks (Your Time, NY, London, Tokyo, Sydney, Dubai) | setInterval 1s | `MarketClocks.tsx` | [ ] |
| 42 | Session status strip (Asia/London/NY: Open/Closed/countdown) | Client-side | Same logic | [ ] |
| 43 | Timezone selector | `<select>` with all zones | Profile setting | [ ] |
| 44 | Session H/L cards (Asia/London/NY) | Yahoo Finance fetch | `/api/session-levels` proxy | [ ] |
| 45 | Session toggle bar (show/hide sessions) | DOM toggles | React state | [ ] |
| 46 | Session day navigation (prev/next/reset) | DOM state | React state | [ ] |
| 47 | DoL charts (Draws on Liquidity) | lightweight-charts | `DoLCharts.tsx` | [ ] |
| 48 | DoL timeframe tabs (D/W/M) | DOM tabs | React tabs | [ ] |
| 49 | DoL legend (session colours) | DOM | React | [ ] |
| 50 | P&L Journal Calendar | localStorage + DOM | `PnLCalendar.tsx` + Supabase | [ ] |
| 51 | P&L inline editing (type amount, auto-colour) | textarea + DOM | `PnLCell.tsx` | [ ] |
| 52 | P&L notes per day | localStorage | `trade_journal.notes` | [ ] |
| 53 | P&L monthly summary (total, win rate, avg, best, worst) | Client-side calc | `PnLSummary.tsx` | [ ] |
| 54 | P&L month navigation | DOM state | React state | [ ] |
| 55 | P&L collapsible calendar | DOM toggle | React state | [ ] |
| 56 | P&L amount parsing (+$250, -$100, $50, -50) | `parsePnL()` | Port to `utils.ts` | [ ] |
| 57 | Signal Scanner -- ICT analysis | Client-side compute | `/api/scanner` | [ ] |
| 58 | Scanner category tabs (ICT/SMC/Classic/Price Action) | DOM tabs | `ScannerControls.tsx` | [ ] |
| 59 | Scanner instrument dropdown | DOM dropdown | React dropdown | [ ] |
| 60 | Scanner timeframe tabs (5m/15m/1H/4H) | DOM tabs | React tabs | [ ] |
| 61 | Scanner scan button with loading animation | DOM | React state | [ ] |
| 62 | Setup cards (direction, levels, R:R, confidence, tags) | DOM render | `SetupCard.tsx` | [ ] |
| 63 | Multi-timeframe setups with HTF context | Client-side | Server-side | [ ] |
| 64 | Scanner disclaimer banner | DOM | React | [ ] |
| 65 | Social feed section (X/Twitter embeds) | DOM + localStorage | `SocialFeed.tsx` | [ ] |
| 66 | Social handle management (add/remove) | DOM + localStorage | Same | [ ] |
| 67 | Theme customiser -- 8 presets | localStorage | `profiles.theme_custom` | [ ] |
| 68 | Theme customiser -- per-colour overrides (bg, accent, bull, bear, etc.) | CSS vars + localStorage | CSS vars + Supabase | [ ] |
| 69 | Theme accordion sections (Background, Accents, Sessions) | DOM | React accordion | [ ] |
| 70 | Pre-market signal category tabs (QQQ/SPY/DXY/etc.) | DOM tabs | React tabs | [ ] |
| 71 | Signal instrument dropdown (categorised) | DOM dropdown | React dropdown | [ ] |
| 72 | 60s auto-refresh for quotes/bias/news | setInterval | SWR `refreshInterval` | [ ] |
| 73 | Status bar (last updated time, refresh button) | DOM | `StatusBar.tsx` | [ ] |

---

## 8. Tech Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | Next.js | 14.x | App Router, server components, API routes |
| **Language** | TypeScript | 5.x | Type safety across the stack |
| **Styling** | Tailwind CSS | 3.x | Utility-first CSS, dark mode |
| **Auth** | Supabase Auth | latest | Email/password, Google OAuth, session cookies |
| **Database** | Supabase PostgreSQL | 15+ | User data, caches, journal, RLS |
| **File Storage** | Supabase Storage | latest | Reference chart images (replaces localStorage) |
| **Realtime** | Supabase Realtime | latest | Live bias votes, community features |
| **Data Fetching** | SWR | 2.x | Stale-while-revalidate, polling, caching |
| **Charts (embed)** | TradingView Widgets | latest | Live financial charts (iframe) |
| **Charts (custom)** | lightweight-charts | 4.x | DoL charts, custom visualisations |
| **Market Data** | Finnhub API | free tier | Quotes (QQQ/SPY), news, economic calendar |
| **Calendar Data** | Forex Factory (faireconomy mirror) | N/A | Weekly economic calendar feed |
| **Payments** | Stripe | latest | Phase 2 subscriptions, checkout, webhooks |
| **Deployment** | Vercel | Hobby/Pro | Next.js hosting, edge functions, preview deploys |
| **Package Manager** | pnpm | 8.x | Fast, disk-efficient |
| **Linting** | ESLint + Prettier | latest | Code quality |
| **Testing** | Vitest + React Testing Library | latest | Unit + component tests |

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Finnhub
FINNHUB_API_KEY=xxx

# Stripe (Phase 2)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### Estimated Timeline

| Phase | Scope | Duration | Ship Date |
|-------|-------|----------|-----------|
| Phase 1 Steps 1-6 | Auth + Layout + Calendar + News | 7 days | Week 1 |
| Phase 1 Steps 7-11 | Bias + Snapshot + Sessions + Liquidity + Journal | 8 days | Week 2-3 |
| Phase 1 Steps 12-15 | DoL + Scanner + Theme + Social | 4 days | Week 3 |
| Phase 1 Steps 16-18 | Preferences + Community + Polish | 5 days | Week 4 |
| Phase 2 | Stripe + Gating + Alerts + Teams | 10-15 days | Week 6-8 |

**Total Phase 1:** ~25 working days for a solo dev
**Total Phase 2:** ~15 working days

---

## Appendix: Key Code Blocks to Port

These are the most complex pieces of logic that need careful porting from the HTML file:

1. **Bias Engine** (lines 2916-3060): Multi-factor scoring using futures direction, move strength, price vs previous close, calendar risk, ICT confluence. Port to `lib/bias-engine.ts`.

2. **ICT Scanner** (lines 4789-5600): Swing detection, structure analysis (BOS/CHoCH/MSS), FVG finder, order blocks, equal highs/lows, liquidity voids, breaker blocks, inducement, turtle soup, premium/discount zones, multi-timeframe confluence. Port to `lib/ict-scanner.ts`.

3. **Calendar Merger** (lines 2219-2280): Fetch from two sources in parallel, normalize event format, deduplicate by date+time+currency+name hash. Port to `lib/calendar-merger.ts`.

4. **Session Boundaries** (lines 4874-4930): Asia (19:00-04:00 ET), London (03:00-11:30 ET), New York (09:30-16:00 ET) with DST handling. Port to `lib/constants.ts`.

5. **P&L Parser** (lines 4322-4340): Parses flexible input formats (+$250, -$100, $50, -50, +250) into numeric values. Port to `lib/utils.ts`.

6. **Theme System** (lines 4164-4310): 8 presets with 15+ CSS custom properties, accordion-based colour picker, real-time preview. Port to `ThemeProvider.tsx`.
