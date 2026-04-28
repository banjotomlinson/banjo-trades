# TraderM8 — Build Map

A navigable map of every feature, route, and piece of infrastructure that
ships in the current build. Open the workspace at `traderm8.code-workspace`
and use this doc to find what you need.

---

## Live URLs

- Production: https://traderm8.com
- Vercel alias: https://traderm8.vercel.app
- Legacy alias (still resolves): https://banjo-trades-omega.vercel.app

## Run locally

```bash
npm run dev          # http://localhost:3000
npm run build        # full production build
npx tsc --noEmit     # type-check only
vercel deploy --prod --yes   # ship a deploy live
```

## Stack

- Next.js 16 (App Router, Turbopack) — read `node_modules/next/dist/docs/`
  for any unfamiliar API; this Next.js has breaking changes from older versions
- Supabase (Auth + Postgres + Storage)
- Tailwind v4
- TypeScript
- framer-motion (hero scroll animation, mobile nav)
- Resend (transactional email)

---

## Routes

### Marketing (public)

| Route | File | Notes |
|---|---|---|
| `/landing` | [src/app/landing/page.tsx](src/app/landing/page.tsx) | Hero with 3D scroll-rotate dashboard, feature grid, reviews marquee, founder bio, FAQ, waitlist form |
| `/landing/features` | [src/app/landing/features/page.tsx](src/app/landing/features/page.tsx) | All 8 spotlights (bias, liquidity, calendar, movers, seasonality, calc, journal, planner) |

Shared landing components: [src/app/landing/_components.tsx](src/app/landing/_components.tsx)
Spotlight data: [src/app/landing/_spotlights.ts](src/app/landing/_spotlights.ts)
Screenshots: [public/landing/](public/landing/)

### Auth

| Route | File | Notes |
|---|---|---|
| `/login` | [src/app/(auth)/login/page.tsx](src/app/(auth)/login/page.tsx) | Google OAuth button + error states (`not_on_waitlist`, `past_cap`, etc.) |
| `/callback` | [src/app/(auth)/callback/route.ts](src/app/(auth)/callback/route.ts) | After OAuth, runs the 100-spot gate via `checkAndApprove()` and either redirects to `/` or signs out and rejects |

### Dashboard (auth required)

Layout: [src/app/(dashboard)/layout.tsx](src/app/(dashboard)/layout.tsx)
Sidebar: [src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx)

| Route | File |
|---|---|
| `/` | [src/app/(dashboard)/page.tsx](src/app/(dashboard)/page.tsx) |
| `/calendar` | [src/app/(dashboard)/calendar/page.tsx](src/app/(dashboard)/calendar/page.tsx) |
| `/movers` | [src/app/(dashboard)/movers/page.tsx](src/app/(dashboard)/movers/page.tsx) |
| `/seasonality` | [src/app/(dashboard)/seasonality/page.tsx](src/app/(dashboard)/seasonality/page.tsx) |
| `/liquidity` | [src/app/(dashboard)/liquidity/page.tsx](src/app/(dashboard)/liquidity/page.tsx) |
| `/journal` | [src/app/(dashboard)/journal/page.tsx](src/app/(dashboard)/journal/page.tsx) |
| `/planner` | [src/app/(dashboard)/planner/page.tsx](src/app/(dashboard)/planner/page.tsx) |
| `/feedback` | [src/app/(dashboard)/feedback/page.tsx](src/app/(dashboard)/feedback/page.tsx) |
| `/settings` | [src/app/(dashboard)/settings/page.tsx](src/app/(dashboard)/settings/page.tsx) |
| `/popouts/calculator` | [src/app/popouts/calculator/page.tsx](src/app/popouts/calculator/page.tsx) — pop-out position calculator |

### API routes

| Route | File | Purpose |
|---|---|---|
| `/api/yahoo` | [src/app/api/yahoo/route.ts](src/app/api/yahoo/route.ts) | Yahoo finance proxy with Supabase cache |
| `/api/refresh-market` | [src/app/api/refresh-market/route.ts](src/app/api/refresh-market/route.ts) | Cron job (daily) — pre-warms market_candles |
| `/api/calendar` | [src/app/api/calendar/route.ts](src/app/api/calendar/route.ts) | Finnhub economic calendar |
| `/api/news` | [src/app/api/news/route.ts](src/app/api/news/route.ts) | Filtered Breaking News feed |
| `/api/quotes` | [src/app/api/quotes/route.ts](src/app/api/quotes/route.ts) | Quote endpoint |
| `/api/analysis` | [src/app/api/analysis/route.ts](src/app/api/analysis/route.ts) | ICT analysis |
| `/api/theme` | [src/app/api/theme/route.ts](src/app/api/theme/route.ts) | User theme persistence |
| `/api/waitlist` | [src/app/api/waitlist/route.ts](src/app/api/waitlist/route.ts) | Saves signup, fires admin notification + applicant welcome emails |

---

## Major Features (this build)

### 1. Trading Mode Provider

User-wide asset class filter (All / Futures / Commodities / Crypto / Forex).
Driven by sidebar dropdown AND bias cards.

- Provider: [src/components/providers/TradingModeProvider.tsx](src/components/providers/TradingModeProvider.tsx)
- Used by: SessionLevels, MarketsSnapshot, DashboardCharts, PositionCalculator, LiquidityHeatmap
- Mode also drives the calendar's currency filter via [CalendarFilterProvider](src/components/providers/CalendarFilterProvider.tsx)

### 2. Economic Calendar

- Component: [src/components/dashboard/EconomicCalendar.tsx](src/components/dashboard/EconomicCalendar.tsx)
- Currency multi-select pinned to top-10 BIS currencies
- Today's cell tinted with accent ring
- Tooltip stays open while hovered (no pop-in lag when switching views)
- Loading state gated by `pendingKey` so partial events don't flash

### 3. Breaking News Filter

Relevance-scored news pipeline. Source weights (Reuters/Bloomberg/FT up,
PR wires/listicle farms down) + keyword scoring (Fed/CPI/NFP/yields/oil/etc).

- Filter: [src/lib/news/filter.ts](src/lib/news/filter.ts)
- UI: [src/components/dashboard/BreakingNews.tsx](src/components/dashboard/BreakingNews.tsx)
- Toggle in panel header lets the user see All vs Filtered

### 4. Market Movers

Top mover hero card + ranked list across asset classes with 1-year date scrubber.

- Page: [src/app/(dashboard)/movers/page.tsx](src/app/(dashboard)/movers/page.tsx)
- Component: [src/components/dashboard/MoversPanel.tsx](src/components/dashboard/MoversPanel.tsx)

### 5. Seasonality

15y / 10y / 5y / YTD overlay chart with hover crosshair tooltip + min/max
envelope band. Pure SVG, no chart lib.

- Page: [src/app/(dashboard)/seasonality/page.tsx](src/app/(dashboard)/seasonality/page.tsx)
- Component: [src/components/dashboard/SeasonalityPanel.tsx](src/components/dashboard/SeasonalityPanel.tsx)

### 6. Position Calculator + Pop-out

Three-input sizing tool with detachable browser window (440×720) for chart-side use.

- Component: [src/components/dashboard/PositionCalculator.tsx](src/components/dashboard/PositionCalculator.tsx)
- Pop-out route: [src/app/popouts/calculator/page.tsx](src/app/popouts/calculator/page.tsx)
- Pop-out layout (no sidebar): [src/app/popouts/layout.tsx](src/app/popouts/layout.tsx)

### 7. Journal — P&L Calendar + Yearly View

- Calendar: [src/components/dashboard/PnLCalendar.tsx](src/components/dashboard/PnLCalendar.tsx)
- Toggle pill flips between Monthly grid (day cells, weekly Saturday totals)
  and Yearly grid (12 month tiles, click any tile drills back to monthly)
- Today's cell tinted with accent ring
- Trade data lives in `localStorage` (`banjo-pnl-trades-v1`) for now

### 8. Trade Planner

Two-column playbook: Trade Plan (blue) on the left, Risk Management (amber)
on the right. Multi-line auto-expanding textareas. Synced to Supabase per user.

- Component: [src/components/dashboard/PlannerBoard.tsx](src/components/dashboard/PlannerBoard.tsx)
- Page: [src/app/(dashboard)/planner/page.tsx](src/app/(dashboard)/planner/page.tsx)
- Local store (preview): [src/lib/planner/localStore.ts](src/lib/planner/localStore.ts)
- Supabase store (live): [src/lib/planner/supabaseStore.ts](src/lib/planner/supabaseStore.ts)
- Migration: [src/lib/supabase/migrations/005_planner.sql](src/lib/supabase/migrations/005_planner.sql)

### 9. Feedback Board

Kanban (Backlog / In Progress / Completed) with vote upvoting, attachments
to Supabase Storage, admin status changes, role-gated UI.

- Component: [src/components/dashboard/FeedbackBoard.tsx](src/components/dashboard/FeedbackBoard.tsx)
- Page: [src/app/(dashboard)/feedback/page.tsx](src/app/(dashboard)/feedback/page.tsx)
- Local store (preview): [src/lib/feedback/localStore.ts](src/lib/feedback/localStore.ts)
- Supabase store (live): [src/lib/feedback/supabaseStore.ts](src/lib/feedback/supabaseStore.ts)
- Types: [src/lib/feedback/types.ts](src/lib/feedback/types.ts)
- Migration: [src/lib/supabase/migrations/004_feedback.sql](src/lib/supabase/migrations/004_feedback.sql)

### 10. Header (active session)

Top-right pill cycles through ASIA / LONDON / LONDON-NY / NEW YORK /
AFTER HOURS / WEEKEND based on ET clock — replaces the old "OPEN/CLOSED"
binary.

- Component: [src/components/layout/Header.tsx](src/components/layout/Header.tsx)

### 11. Landing Page (Marketing)

- Hero: 3D scroll-rotate animation via [src/components/ui/container-scroll-animation.tsx](src/components/ui/container-scroll-animation.tsx)
- 9-card feature grid + Reviews marquee + Founder bio + FAQ + Waitlist
- Mobile hamburger menu with full-screen animated panel
- Smooth scroll: globals.css adds `scroll-behavior: smooth` + 5rem nav offset

### 12. Waitlist + Email Pipeline

Form fields: name, email, what you trade, experience, pain point — all required.

- Form: in [src/app/landing/page.tsx](src/app/landing/page.tsx) (Waitlist component)
- API: [src/app/api/waitlist/route.ts](src/app/api/waitlist/route.ts)
- Email helpers: [src/lib/email/waitlist.ts](src/lib/email/waitlist.ts)
- Migration (table): [src/lib/supabase/migrations/006_waitlist.sql](src/lib/supabase/migrations/006_waitlist.sql)
- Migration (name col): [src/lib/supabase/migrations/007_waitlist_name.sql](src/lib/supabase/migrations/007_waitlist_name.sql)
- Sender: `hello@traderm8.com` (Resend, domain verified)
- Two emails per signup: admin notification to banjotomlinson@gmail.com
  with running tally + applicant welcome with sign-in link (or "you're
  on the waitlist" if they're past 100)

### 13. 100-Spot Auth Gate

First 100 waitlist signups get auto-approved on first sign-in. Past 100,
sign-in is rejected with `?error=past_cap&position=N`.

- Logic: [src/app/(auth)/callback/route.ts](src/app/(auth)/callback/route.ts) — `checkAndApprove()`
- Migration: [src/lib/supabase/migrations/008_profile_approved_at.sql](src/lib/supabase/migrations/008_profile_approved_at.sql)
- Existing accounts grandfathered (backfill set `approved_at = created_at`)
- Admin role bypasses cap

### 14. Roles (Admin / User)

Backend-only field on `public.profiles.role`. No UI ever writes it.
Only `banjotomlinson@gmail.com` is admin.

- Migration: [src/lib/supabase/migrations/003_user_roles.sql](src/lib/supabase/migrations/003_user_roles.sql)
- Helper: `public.is_admin(uid)` Postgres function
- Used in: feedback RLS, callback gate, `MarketsSnapshot` admin badges

### 15. Shared Market Data Cache (Yahoo)

Fan-out cache so 1k users hit Yahoo as 1 user.

- Helper: [src/lib/marketCache.ts](src/lib/marketCache.ts)
- Migration: [src/lib/supabase/migrations/002_market_candles.sql](src/lib/supabase/migrations/002_market_candles.sql)
- Cron config: [vercel.json](vercel.json)

---

## Database (Supabase)

Project ref: `ljnstvgruwougxpqtoyf` ([dashboard](https://supabase.com/dashboard/project/ljnstvgruwougxpqtoyf))

| Migration | Adds |
|---|---|
| `001_profiles.sql` | profiles, user_theme, on-signup trigger |
| `002_market_candles.sql` | market_candles cache table |
| `003_user_roles.sql` | role column on profiles, is_admin() function, public profiles read |
| `004_feedback.sql` | feedback + feedback_votes + storage bucket |
| `005_planner.sql` | plans table |
| `006_waitlist.sql` | waitlist_signups table |
| `007_waitlist_name.sql` | name column on waitlist_signups |
| `008_profile_approved_at.sql` | approved_at column for 100-spot gate |

All migrations live in [src/lib/supabase/migrations/](src/lib/supabase/migrations/).

## Storage Buckets

- `feedback-attachments` — public bucket, 10MB cap, per-user folder upload policy

## Storage cron

| When | Path | What |
|---|---|---|
| `0 13 * * *` (daily UTC 13:00) | `/api/refresh-market` | Pre-warms market_candles for the dashboard's hot symbols |

Auth via `Authorization: Bearer $CRON_SECRET`.

---

## Environment variables

Live in `.env.local` (gitignored). Vercel mirrors them in production.

| Var | Used by |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role Supabase (waitlist insert, email lookups, etc.) |
| `FINNHUB_API_KEY` | calendar + news APIs |
| `CRON_SECRET` | gates `/api/refresh-market` |
| `RESEND_API_KEY` | transactional email |

---

## Branch / git workflow

- Working branch: `feature/wire-signal-tabs`
- Remote: `https://github.com/zacgoodall/banjo-trades`
- All commits in this build live on the feature branch
- Per CLAUDE.md, do NOT push directly to `main` — open a PR

## Deploy script (one-liner I use after each commit)

```bash
git add -A && git commit -m "..." && git push origin feature/wire-signal-tabs && vercel deploy --prod --yes
```

---

## Outstanding manual steps

These can't be automated — Banjo needs to do them in a browser:

1. **Google OAuth** — add `https://traderm8.com` to Authorized JavaScript
   origins in Google Cloud Console for the OAuth client
   `1039000573190-...`. Otherwise sign-in from the new domain shows a
   Google-side error.
2. **Real banjo.jpg** — drop a photo at `public/landing/banjo.jpg` to
   replace the placeholder under the founder bio.

---

_Generated by Claude Code._
