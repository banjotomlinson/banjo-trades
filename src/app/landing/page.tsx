"use client";

import Link from "next/link";
import { useState } from "react";

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      <BgEffects />
      <Nav />
      <Hero />
      <LogoStrip />
      <FeatureGrid />
      <Spotlight
        eyebrow="Bias & Session Levels"
        title="Know which way the market's drawing — before you click buy."
        body="ICT/SMC bias cards refresh on every candle close across NQ, ES, Gold, BTC and EUR/USD. Session H/L for Asia, London and New York lift onto the dashboard with pivot points calculated, so you stop drawing rectangles by hand at 3am."
        bullets={[
          "Mode-aware: flip to Crypto and the whole dashboard re-skins.",
          "Pivots, ranges, and live/closed status per session.",
          "Header tells you exactly which session is open, in your time zone.",
        ]}
        image="/landing/sessions.png"
        placeholder="Asia / London / New York session cards + position calculator"
        flip={false}
      />
      <Spotlight
        eyebrow="Liquidity Heatmap"
        title="See where price is being drawn, not just where it is."
        body="A live map of buy-side and sell-side liquidity pools tagged by source — PDH, PWL, equal highs, Asia high — sorted by distance and scored by likelihood of being the next sweep."
        bullets={[
          "Heat colour-coded: red high-prob sweeps stand out instantly.",
          "Filters out tapped levels so the list stays current.",
          "Per-instrument: NAS100, ES, Gold, Oil, BTC, EUR/USD and more.",
        ]}
        image="/landing/liquidity.png"
        placeholder="NAS100 buy-side / sell-side liquidity pools"
        flip
      />
      <Spotlight
        eyebrow="Economic Calendar"
        title="Filter the noise. Trade the events that actually move."
        body="Multi-currency macro calendar with daily, weekly and monthly grids. Each event tagged HIGH / MED / LOW impact and Bullish / Bearish / Mixed bias. Side-panel Breaking News is relevance-scored — Reuters/Bloomberg up, listicle farms out."
        bullets={[
          "10 most-traded currencies pinned to the filter row.",
          "Click a day → see every event with bias and forecast.",
          "Currency selection syncs to the home Next-Event countdown.",
        ]}
        image="/landing/calendar.png"
        placeholder="Monthly calendar grid with Breaking News sidebar"
        flip={false}
      />
      <Spotlight
        eyebrow="Market Movers"
        title="Spot the unusual stuff fast — across every asset class."
        body="Today's biggest movers across futures, commodities, crypto and forex in one ranked list. The top mover gets a hero card; the rest fall in by absolute % move. Scrub the date back through the year to study previous big days."
        bullets={[
          "All / Futures / Commodities / Crypto / Forex tabs.",
          "1-year date scrubber — instant lookup, no extra fetch.",
          "Cached at the edge so 1k users hit upstream as 1.",
        ]}
        image="/landing/movers.png"
        placeholder="Top mover hero card + ranked list"
        flip
      />
      <Spotlight
        eyebrow="Seasonality"
        title="The edge nobody on FinTwit talks about."
        body="Average price path through any month for any instrument, layered 15-year, 10-year, 5-year and year-to-date. Hover the chart to read each line's exact percentage at any day. Stats card shows avg return, win rate, best/worst year."
        bullets={[
          "30+ instruments — futures, commodities, FX, crypto.",
          "Min/max envelope band shows the historical extremes.",
          "Backtest your gut feel before you put real money on it.",
        ]}
        image="/landing/seasonality.png"
        placeholder="NQ April seasonality chart"
        flip={false}
      />
      <Spotlight
        eyebrow="Position Calculator"
        title="Pop it onto your second monitor. Never miss size again."
        body="Three inputs — contract, risk amount, stop in points — out comes the size, the dollar risk, and a clean R:R derivation. One-click pop-out lives in its own draggable window beside your charts."
        bullets={[
          "Single grouped dropdown for every contract you trade.",
          "Mode-aware: only shows the contracts for your active asset class.",
          "Pop-out window survives chart navigation and reloads.",
        ]}
        image="/landing/sessions.png"
        placeholder="Position calculator + session levels"
        flip
      />
      <Spotlight
        eyebrow="Journal & Analytics"
        title="A journal that tells the truth, not the story you wanted."
        body="Tap a day to log a trade. Watch the calendar fill in green and red. Weekly totals on the Saturday cell. Flip to yearly view for a 12-month grid. Scroll down for the equity curve, win rate, profit factor, max drawdown, day-of-week breakdown, streaks."
        bullets={[
          "Monthly + Yearly P/L views with calendar tile colouring.",
          "Per-week summary on every Saturday cell.",
          "Stats update live as you log — no spreadsheet glue.",
        ]}
        image="/landing/journal.png"
        placeholder="Monthly P&L calendar with green/red cells"
        flip={false}
      />
      <Spotlight
        eyebrow="Trade Planner"
        title="Your daily playbook on the same screen as your dashboard."
        body="Two columns per plan — Trade Plan on the left, Risk Management on the right. Type the rules you actually follow, read them every morning, edit when something changes. No checkboxes pretending it's a to-do list."
        bullets={[
          "Numbered text rows, multi-line, auto-expanding.",
          "Per-plan title, multiple plans, sorted by most recent edit.",
          "Synced to your account across every device you sign in on.",
        ]}
        image="/landing/planner.png"
        placeholder="planner with trade plan + risk management columns"
        flip
      />
      <Coverage />
      <FounderNote />
      <Waitlist />
      <FAQ />
      <Footer />
    </main>
  );
}

// ── Background gradient blobs ─────────────────────────────────────
function BgEffects() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[1100px] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.18),transparent_60%)]" />
      <div className="absolute top-[60vh] -right-40 w-[700px] h-[700px] bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.10),transparent_60%)]" />
      <div className="absolute top-[120vh] -left-40 w-[700px] h-[700px] bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent,#05070d_70%)]" />
    </div>
  );
}

// ── Top nav ───────────────────────────────────────────────────────
function Nav() {
  return (
    <nav className="relative z-50 sticky top-0 backdrop-blur-md bg-[#05070d]/70 border-b border-white/5">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/landing" className="flex items-center gap-2">
          <Logo />
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-[#94a3b8]">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#about" className="hover:text-white transition-colors">About</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="#waitlist"
            className="hidden sm:inline-flex text-xs font-semibold text-[#94a3b8] hover:text-white px-3 py-2 transition-colors"
          >
            Get early access
          </a>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
          >
            Login
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Logo({ size = "default" }: { size?: "default" | "lg" }) {
  const c =
    size === "lg" ? "text-3xl tracking-tight" : "text-base tracking-tight";
  return (
    <span className={`font-bold text-white ${c}`}>
      Trader<span className="text-[#3b82f6]">M8</span>
    </span>
  );
}

// ── Hero ──────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative z-10 px-5 sm:px-8 pt-24 pb-20 sm:pt-32 sm:pb-28">
      <div className="max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse" />
          Closed beta — first 500 lock founder pricing
        </div>
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.05]">
          Trade with <span className="bg-gradient-to-br from-[#60a5fa] via-[#3b82f6] to-[#1d4ed8] bg-clip-text text-transparent">your mate</span>
          <br className="hidden sm:block" />
          <span className="sm:inline"> beside you.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-[#94a3b8] leading-relaxed">
          TraderM8 is the trading dashboard built for the way you actually trade.
          Bias cards, session levels, liquidity heatmaps, a journal that tells
          the truth, and a position calculator that pops out next to your charts.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="#waitlist"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-semibold px-6 py-3 rounded-md shadow-lg shadow-[#3b82f6]/25 transition-all hover:shadow-[#3b82f6]/40"
          >
            Join the waitlist
            <span aria-hidden>→</span>
          </a>
          <a
            href="#features"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-white text-sm font-semibold px-6 py-3 rounded-md transition-colors"
          >
            See what's inside
          </a>
        </div>
        <p className="mt-4 text-[11px] text-[#475569]">
          Free for the first 500 traders · No card required · Lock founder pricing forever
        </p>
      </div>

      {/* Hero screenshot */}
      <div className="max-w-6xl mx-auto mt-16">
        <BrowserFrame label="dashboard">
          <Screenshot
            src="/landing/dashboard.png"
            alt="TraderM8 dashboard with charts, bias cards, and countdown"
            placeholder="Homepage / Dashboard screenshot"
            sub="Bias cards · Session levels · Liquidity heatmap · Position calculator"
          />
        </BrowserFrame>
      </div>
    </section>
  );
}

// ── Trust strip / asset class coverage ────────────────────────────
function LogoStrip() {
  return (
    <section className="relative z-10 px-5 sm:px-8 py-12 border-y border-white/5 bg-white/[0.015]">
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-[11px] uppercase tracking-[0.18em] font-bold text-[#475569] mb-6">
          Built for every asset class you trade
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-[#64748b]">
          {["Index Futures", "Forex", "Crypto", "Commodities", "Indices"].map((c) => (
            <span
              key={c}
              className="text-sm font-semibold tracking-wide"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 6-card feature grid ───────────────────────────────────────────
function FeatureGrid() {
  const features = [
    {
      icon: "▲",
      title: "ICT/SMC Bias Cards",
      body: "Daily and 1H confluence scoring on five flagship instruments. Updates on every candle close.",
    },
    {
      icon: "⚡",
      title: "Session Levels",
      body: "Asia / London / New York highs and lows lifted automatically — no more drawing rectangles by hand.",
    },
    {
      icon: "💧",
      title: "Liquidity Heatmap",
      body: "Untapped buy-side and sell-side pools tagged, scored, and sorted by distance from current price.",
    },
    {
      icon: "🧮",
      title: "Position Calculator",
      body: "Three inputs in, exact size and risk out. Pop it into a draggable window beside your charts.",
    },
    {
      icon: "📓",
      title: "P&L Journal",
      body: "Tap a day, log a trade, watch the calendar fill in green and red. Yearly view rolls up the full 12 months.",
    },
    {
      icon: "🗒️",
      title: "Trade Planner",
      body: "Daily playbook with Trade Plan + Risk Management side by side. Synced across every device you sign in on.",
    },
    {
      icon: "📅",
      title: "Economic Calendar",
      body: "Currency-filtered macro events plus a relevance-scored Breaking News feed. Less noise, more signal.",
    },
    {
      icon: "📈",
      title: "Market Movers",
      body: "Date-scrubbable % movers across futures, crypto, forex, commodities. Find the unusual stuff fast.",
    },
    {
      icon: "🍂",
      title: "Seasonality",
      body: "15y / 10y / 5y / YTD overlays for any month and any instrument. Hover for the exact daily average.",
    },
  ];
  return (
    <section id="features" className="relative z-10 px-5 sm:px-8 py-24">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          eyebrow="The toolkit"
          title="Everything you tab between, in one place."
          subtitle="Stop juggling fourteen browser tabs. TraderM8 wraps your bias, your levels, your sizing, your journal, and your plan into a single fast UI."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-14">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 rounded-xl p-6 hover:border-[#3b82f6]/40 hover:from-white/[0.06] transition-all"
            >
              <div className="text-2xl mb-4 inline-flex w-10 h-10 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/20 items-center justify-center text-[#3b82f6]">
                {f.icon}
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-[#94a3b8] leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[#3b82f6] mb-3">
        {eyebrow}
      </div>
      <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base text-[#94a3b8] leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

// ── Spotlight: alternating screenshot + copy rows ────────────────
function Spotlight({
  eyebrow,
  title,
  body,
  bullets,
  image,
  placeholder,
  flip,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  image?: string;
  placeholder: string;
  flip: boolean;
}) {
  return (
    <section className="relative z-10 px-5 sm:px-8 py-20 sm:py-24">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div className={flip ? "lg:order-2" : ""}>
          <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[#3b82f6] mb-3">
            {eyebrow}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
            {title}
          </h2>
          <p className="mt-4 text-base text-[#94a3b8] leading-relaxed">{body}</p>
          <ul className="mt-6 space-y-2.5">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-[#e2e8f0]">
                <span className="mt-[5px] inline-block w-1.5 h-1.5 rounded-full bg-[#3b82f6] shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={flip ? "lg:order-1" : ""}>
          <BrowserFrame label={eyebrow.toLowerCase().replace(/\s+/g, "-")}>
            <Screenshot src={image} alt={`${title} screenshot`} placeholder={placeholder} />
          </BrowserFrame>
        </div>
      </div>
    </section>
  );
}

// ── Coverage / what's covered today ───────────────────────────────
function Coverage() {
  return (
    <section id="about" className="relative z-10 px-5 sm:px-8 py-24 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          eyebrow="Why it exists"
          title="The dashboard the founder wished existed."
          subtitle="Built day-by-day in public by a working trader. Every panel comes from a real frustration with what's already out there."
        />
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card title="Made for retail" body="Not a fund tool dumbed down. Designed from day one for traders sizing $50k prop accounts and personal money." />
          <Card title="Fast over fancy" body="Sub-30s edge cache, shared Supabase data layer — same load whether one user is on it or one thousand." />
          <Card title="No subscription tax" body="Free tier covers the entire toolkit. Pay once if you want ad-free. Nothing locked behind recurring billing." />
        </div>
      </div>
    </section>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-[#94a3b8] leading-relaxed">{body}</p>
    </div>
  );
}

// ── Founder note ──────────────────────────────────────────────────
function FounderNote() {
  return (
    <section className="relative z-10 px-5 sm:px-8 py-24">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-full bg-[#3b82f6] flex items-center justify-center text-white font-bold text-lg">
              B
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Banjo Tomlinson</div>
              <div className="text-xs text-[#64748b]">Founder · TraderM8</div>
            </div>
          </div>
          <p className="text-base text-[#e2e8f0] leading-relaxed">
            "I&apos;d rather have a clean dashboard, a journal that doesn&apos;t lie
            to me, and a calculator that just works — than another paid Discord
            telling me to buy. TraderM8 is what I wanted before I built it.
            If you&apos;re an ICT/SMC trader who&apos;s tired of opening fourteen
            tabs every morning, you&apos;ll feel right at home."
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Waitlist form ─────────────────────────────────────────────────
function Waitlist() {
  const [email, setEmail] = useState("");
  const [primaryAsset, setPrimaryAsset] = useState("");
  const [experience, setExperience] = useState("");
  const [painPoint, setPainPoint] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "err">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [alreadyJoined, setAlreadyJoined] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          primary_asset: primaryAsset || null,
          experience: experience || null,
          pain_point: painPoint || null,
          source: "landing",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("err");
        setErrorMsg(data?.error ?? "Something went wrong");
        return;
      }
      setAlreadyJoined(Boolean(data.alreadyJoined));
      setStatus("ok");
    } catch {
      setStatus("err");
      setErrorMsg("Network error — try again in a moment.");
    }
  }

  if (status === "ok") {
    return (
      <section id="waitlist" className="relative z-10 px-5 sm:px-8 py-24">
        <div className="max-w-md mx-auto text-center rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/[0.06] p-10">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {alreadyJoined ? "You're already on the list." : "You're on the list."}
          </h2>
          <p className="text-sm text-[#94a3b8]">
            {alreadyJoined
              ? "Sit tight — we'll email when your spot opens up."
              : "We'll send you an invite when the closed beta opens. Keep an eye on your inbox."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="waitlist" className="relative z-10 px-5 sm:px-8 py-24 border-t border-white/5">
      <div className="max-w-2xl mx-auto">
        <SectionHeader
          eyebrow="Closed beta"
          title="Get early access."
          subtitle="The first 500 traders lock in founder pricing — free forever — and get direct line to feature requests."
        />
        <form
          onSubmit={submit}
          className="mt-12 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 sm:p-8 space-y-5"
        >
          <Field label="Email" required>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@trader.com"
              className="w-full bg-[#0a0e17] border border-white/10 rounded-md px-4 py-3 text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-[#3b82f6] transition-colors"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="What do you mainly trade?">
              <select
                value={primaryAsset}
                onChange={(e) => setPrimaryAsset(e.target.value)}
                className="w-full bg-[#0a0e17] border border-white/10 rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3b82f6] transition-colors"
              >
                <option value="">— choose one —</option>
                <option value="futures">Index futures (NQ, ES, etc.)</option>
                <option value="forex">Forex</option>
                <option value="crypto">Crypto</option>
                <option value="commodities">Commodities (Gold, Oil, etc.)</option>
                <option value="stocks">Stocks / Indices</option>
                <option value="all">A bit of everything</option>
              </select>
            </Field>

            <Field label="How long have you been trading?">
              <select
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full bg-[#0a0e17] border border-white/10 rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3b82f6] transition-colors"
              >
                <option value="">— choose one —</option>
                <option value="<1y">Less than a year</option>
                <option value="1-3y">1–3 years</option>
                <option value="3-5y">3–5 years</option>
                <option value="5+y">5+ years</option>
              </select>
            </Field>
          </div>

          <Field label="What's your biggest pain point right now?" optional>
            <textarea
              value={painPoint}
              onChange={(e) => setPainPoint(e.target.value)}
              rows={3}
              placeholder="e.g. juggling tabs, journaling consistency, missing news, sizing mistakes..."
              maxLength={1000}
              className="w-full bg-[#0a0e17] border border-white/10 rounded-md px-4 py-3 text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-[#3b82f6] resize-y transition-colors"
            />
          </Field>

          {status === "err" && (
            <div className="text-sm text-[#ef4444]">{errorMsg}</div>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white text-sm font-semibold px-6 py-3 rounded-md shadow-lg shadow-[#3b82f6]/25 transition-all hover:shadow-[#3b82f6]/40"
          >
            {status === "submitting" ? "Submitting..." : "Reserve my spot"}
          </button>

          <p className="text-[11px] text-[#475569] text-center">
            We&apos;ll only email you when your invite is ready. No newsletter.
            No spam. Unsubscribe with one click.
          </p>
        </form>
      </div>
    </section>
  );
}

function Field({
  label,
  optional,
  required,
  children,
}: {
  label: string;
  optional?: boolean;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider font-bold text-[#94a3b8]">
          {label}
        </span>
        {optional && (
          <span className="text-[10px] text-[#475569]">optional</span>
        )}
        {required && (
          <span className="text-[10px] text-[#3b82f6]">required</span>
        )}
      </div>
      {children}
    </label>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────
function FAQ() {
  const items = [
    {
      q: "When does it launch?",
      a: "Closed beta is rolling now. The first 500 waitlist signups get invites in waves. Public launch follows in Q3.",
    },
    {
      q: "Is it really free?",
      a: "Yes. The full toolkit is free for waitlist beta users forever. We make money on broker affiliates and an optional ad-free pass.",
    },
    {
      q: "Which brokers does it integrate with?",
      a: "TraderM8 is currently a journaling + analysis layer that sits beside your charting platform (TradingView, Tradovate, etc). Auto-imports from broker statements are coming next quarter.",
    },
    {
      q: "Will my trade data stay private?",
      a: "Your journal and plans live on your own row in our database with row-level security. Only you can read them. Admins can see your email and feedback submissions, nothing else.",
    },
    {
      q: "Can I use it on mobile?",
      a: "It's responsive — runs on phones and tablets — but the experience is built for a desktop next to your charts. A native mobile companion is on the roadmap.",
    },
    {
      q: "Why the name?",
      a: '"Your mate of the market." A trading dashboard that feels like a teammate, not a tax form.',
    },
  ];
  return (
    <section id="faq" className="relative z-10 px-5 sm:px-8 py-24">
      <div className="max-w-3xl mx-auto">
        <SectionHeader eyebrow="FAQ" title="Quick answers." />
        <div className="mt-12 space-y-3">
          {items.map((it) => (
            <details
              key={it.q}
              className="group rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/20 transition-colors"
            >
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-white flex items-center justify-between gap-3">
                <span>{it.q}</span>
                <span className="text-[#3b82f6] text-lg leading-none transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="px-5 pb-4 text-sm text-[#94a3b8] leading-relaxed">
                {it.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="relative z-10 px-5 sm:px-8 pt-16 pb-10 border-t border-white/5">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start justify-between gap-6">
        <div>
          <Logo size="lg" />
          <p className="mt-2 text-sm text-[#64748b]">Your mate of the market.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-x-10 gap-y-3 text-sm text-[#64748b]">
          <a href="#features" className="hover:text-white transition-colors">
            Features
          </a>
          <a href="#about" className="hover:text-white transition-colors">
            About
          </a>
          <a href="#faq" className="hover:text-white transition-colors">
            FAQ
          </a>
          <a href="#waitlist" className="hover:text-white transition-colors">
            Waitlist
          </a>
          <Link href="/login" className="hover:text-white transition-colors">
            Login
          </Link>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/5 text-[11px] text-[#475569] flex flex-col sm:flex-row gap-2 justify-between">
        <span>© {new Date().getFullYear()} TraderM8. All rights reserved.</span>
        <span>Trading involves risk. Nothing on this site is financial advice.</span>
      </div>
    </footer>
  );
}

// ── Browser-frame wrapper for screenshots ─────────────────────────
function BrowserFrame({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 bg-[#0a0e17]">
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0f172a] border-b border-white/5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]/70" />
        <span className="ml-3 text-[11px] text-[#475569] font-mono truncate">
          traderm8.com / {label}
        </span>
      </div>
      {children}
    </div>
  );
}

// ── Screenshot: real image when src is provided, otherwise placeholder ─
function Screenshot({
  src,
  alt,
  placeholder,
  sub,
}: {
  src?: string;
  alt?: string;
  placeholder: string;
  sub?: string;
}) {
  if (src) {
    // Display the screenshot at its natural aspect ratio so the focal
    // panel is never cropped. The browser frame sits flush around it.
    return (
      <div className="relative w-full bg-[#0a0e17]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt ?? placeholder}
          className="block w-full h-auto"
          loading="lazy"
        />
      </div>
    );
  }
  return <ScreenshotPlaceholder label={placeholder} sub={sub} />;
}

// ── Screenshot placeholder (fallback) ─────────────────────────────
function ScreenshotPlaceholder({
  label,
  sub,
}: {
  label: string;
  sub?: string;
}) {
  return (
    <div className="relative aspect-[16/10] w-full bg-[#0a0e17] flex items-center justify-center overflow-hidden">
      {/* Dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }}
      />
      {/* Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08),transparent_60%)]" />
      <div className="relative text-center px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-wider font-bold text-[#3b82f6] mb-3">
          <span aria-hidden>🖼️</span>
          Image placeholder
        </div>
        <div className="text-white text-sm sm:text-base font-semibold">
          {label}
        </div>
        {sub && (
          <div className="text-[#64748b] text-xs sm:text-sm mt-1">{sub}</div>
        )}
        <div className="text-[10px] text-[#475569] mt-3">
          drop a screenshot at this slot
        </div>
      </div>
    </div>
  );
}
