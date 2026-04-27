"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BgEffects,
  BrowserFrame,
  Footer,
  Nav,
  Screenshot,
  SectionHeader,
} from "./_components";

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-clip">
      <BgEffects />
      <Nav />
      <Hero />
      <LogoStrip />
      <FeatureGrid />
      <FounderNote />
      <Waitlist />
      <FAQ />
      <Footer />
    </main>
  );
}

// ── Hero ──────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative z-10 px-5 sm:px-8 pt-24 pb-20 sm:pt-32 sm:pb-28">
      <div className="max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse" />
          Closed beta — first 100 unlock free-for-life
        </div>
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.05]">
          Trade with your{" "}
          <span className="bg-gradient-to-br from-[#60a5fa] via-[#3b82f6] to-[#1d4ed8] bg-clip-text text-transparent">
            M8
          </span>
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
          <Link
            href="/landing/features"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-white text-sm font-semibold px-6 py-3 rounded-md transition-colors"
          >
            See every feature in detail
          </Link>
        </div>
        <p className="mt-4 text-[11px] text-[#475569]">
          Free for life — first 100 traders only · No card required · Paid plans after
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

// ── Asset class strip ─────────────────────────────────────────────
function LogoStrip() {
  return (
    <section className="relative z-10 px-5 sm:px-8 py-12 border-y border-white/5 bg-white/[0.015]">
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-[11px] uppercase tracking-[0.18em] font-bold text-[#475569] mb-6">
          Built for every asset class you trade
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-[#64748b]">
          {["Index Futures", "Forex", "Crypto", "Commodities", "Indices"].map((c) => (
            <span key={c} className="text-sm font-semibold tracking-wide">
              {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 9-card overview grid + link to features page ─────────────────
function FeatureGrid() {
  const features = [
    { icon: "▲", title: "ICT/SMC Bias Cards", body: "Daily and 1H confluence scoring on five flagship instruments. Updates on every candle close." },
    { icon: "⚡", title: "Session Levels", body: "Asia / London / New York highs and lows lifted automatically — no more drawing rectangles by hand." },
    { icon: "💧", title: "Liquidity Heatmap", body: "Untapped buy-side and sell-side pools tagged, scored, and sorted by distance from current price." },
    { icon: "🧮", title: "Position Calculator", body: "Three inputs in, exact size and risk out. Pop it into a draggable window beside your charts." },
    { icon: "📓", title: "P&L Journal", body: "Tap a day, log a trade, watch the calendar fill in green and red. Yearly view rolls up the full 12 months." },
    { icon: "🗒️", title: "Trade Planner", body: "Daily playbook with Trade Plan + Risk Management side by side. Synced across every device you sign in on." },
    { icon: "📅", title: "Economic Calendar", body: "Currency-filtered macro events plus a relevance-scored Breaking News feed. Less noise, more signal." },
    { icon: "📈", title: "Market Movers", body: "Date-scrubbable % movers across futures, crypto, forex, commodities. Find the unusual stuff fast." },
    { icon: "🍂", title: "Seasonality", body: "15y / 10y / 5y / YTD overlays for any month and any instrument. Hover for the exact daily average." },
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
        <div className="mt-12 text-center">
          <Link
            href="/landing/features"
            className="inline-flex items-center gap-2 border border-white/10 hover:border-[#3b82f6]/50 hover:bg-white/[0.03] text-white text-sm font-semibold px-6 py-3 rounded-md transition-all"
          >
            See every feature in detail
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Founder note (now also the #about anchor) ─────────────────────
function FounderNote() {
  return (
    <section id="about" className="relative z-10 px-5 sm:px-8 py-24 border-t border-white/5">
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
            &quot;I&apos;d rather have a clean dashboard, a journal that doesn&apos;t lie
            to me, and a calculator that just works — than another paid Discord
            telling me to buy. TraderM8 is what I wanted before I built it.
            If you&apos;re an ICT/SMC trader who&apos;s tired of opening fourteen
            tabs every morning, you&apos;ll feel right at home.&quot;
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
          subtitle="The first 100 traders to join lock in free-for-life access. Everyone else lands on a paid plan when the public launch goes live — so move fast."
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
        {optional && <span className="text-[10px] text-[#475569]">optional</span>}
        {required && <span className="text-[10px] text-[#3b82f6]">required</span>}
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
      a: "Closed beta is rolling now. The first 100 waitlist signups get invites in waves and lock in free-for-life access. Public launch — with paid plans — follows in Q3.",
    },
    {
      q: "Is it really free?",
      a: "Yes — for the first 100 traders to grab a waitlist spot. They get every feature, free, locked in for life, no card required. After that we shift to paid plans to keep the lights on. The 100 freebies don't move with the price changes — once you're in, you're in. Move fast.",
    },
    {
      q: "Will my trade data stay private?",
      a: "Your journal and plans live on your own row in our database with row-level security. Only you can read them. Admins can see your email and feedback submissions, nothing else.",
    },
    {
      q: "Can I use it on mobile?",
      a: "It's responsive — runs on phones and tablets — but the experience is built for a desktop next to your charts.",
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
