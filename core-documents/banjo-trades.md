# Banjo Trades

## Overview

Trading market analysis, strategies, and automation toolkit. Zac trades NASDAQ and S&P 500 only. Only high-impact USD events matter for the calendar.

---

## Built So Far

### Dashboard (`banjo-calendar.html`)

**Live Charts**
- Side-by-side TradingView charts: NASDAQ (NAS100) + S&P 500 (SPX)
- Clean candles only — no indicators, no volume, no toolbars

**Pre-Market Bias Panel**
- Session bias: LONG / SHORT / NEUTRAL with confidence level
- Market status badge: PRE-MARKET / OPEN / AFTER HOURS / CLOSED / WEEKEND
- Live quotes for QQQ + SPY (Finnhub free tier)
- Classic pivot point levels (R2, R1, Pivot, S1, S2) for both indices
- Auto-calculated from: futures direction, move strength, price vs prev close, calendar risk
- Refreshes every 60 seconds

**Economic Calendar**
- Three views: Daily / Weekly / Monthly (toggle tabs)
- Navigate forward/back with arrows, jump to Today
- Impact filters: High (red), Medium (amber), Low (grey), All — click to toggle independently, with event counts
- Monthly view shows colour-coded dots per day, click to drill into daily
- Data merged from Forex Factory + Finnhub economic calendar, deduped
- Countdown timer to next high-impact USD event

**Breaking News**
- Polls Finnhub every 60 seconds, shows all market headlines
- Source badges (Reuters, CNBC)
- Desktop browser notifications for hot stories (NASDAQ/S&P/Fed/geopolitical keywords)
- Auto-refreshes, NEW badges on fresh stories

**Liquidity Pool Heatmap** (placeholder prototype)
- New panel below session levels: ranks nearest untapped liquidity pools above/below current price (PDH/PDL, Asia H/L, London H/L, EQH, PWH/PWL)
- Sort by distance in points, color-dot sweep probability (high / medium / magnet / distant)
- Instrument dropdown (NAS100, SPX seeded; ES/BTC disabled placeholders)
- Reference chart gallery: drag-drop image upload, thumbnails, lightbox, `localStorage` persistence (≤10 images, ≤2 MB each)
- All data hardcoded — placeholder until React/Supabase port

### Daily Analysis Template (`daily-report-template.md`)
- On-demand pre-market report Ryan generates each session
- Covers: bias, futures, key levels, signals, scheduled events, breaking news, risk flags
- Zac says "pre-market report" and Ryan fills it in with live data

---

## How To Use

### Dashboard
1. Open `banjo-calendar.html` in browser
2. Leave tab open while trading — it auto-refreshes everything
3. Check bias panel before NY open (9:30 AM ET / 11:30 PM AEST)

### Pre-Market Report (on-demand)
1. Open a session with Ryan around 11:15 PM AEST
2. Say "pre-market report" or "what's the bias?"
3. Ryan pulls live data and gives LONG/SHORT call with key levels and reasoning

---

## Data Sources

| Source | What | Auth | Cost |
|--------|------|------|------|
| Forex Factory (faireconomy mirror) | Weekly economic calendar | None | Free |
| Finnhub | Quotes, economic calendar, news | API key | Free tier |
| TradingView | Embedded charts | None (widget) | Free |

---

## Capabilities to Build Out

### Market Analysis
- _Awaiting prompts_

### Trading Strategies
- _Awaiting prompts_

### Automation & Alerts
- _Awaiting prompts_

### Tools & Integrations
- _Awaiting prompts_

---

## Notes

- All API keys live in `.env` — never hardcoded (FINNHUB_API_KEY)
- Only trade NASDAQ and S&P 500
- Only care about high-impact USD events on the calendar
- NY session: 9:30 AM — 4:00 PM ET (11:30 PM — 6:00 AM AEST)
- This is a personal project — no client overlap
