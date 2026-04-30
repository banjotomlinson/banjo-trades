"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BgEffects,
  Footer,
  Nav,
  SectionHeader,
} from "./_components";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import BookingModal from "./_booking-modal";

export default function LandingPage() {
  const [bookingOpen, setBookingOpen] = useState(false);
  return (
    <main className="min-h-screen overflow-x-clip">
      <BgEffects />
      <Nav />
      <Hero />
      <LogoStrip />
      <FeatureGrid />
      <Reviews />
      <FounderNote onBook={() => setBookingOpen(true)} />
      <FAQ />
      <CoachingCta onBook={() => setBookingOpen(true)} />
      <Waitlist />
      <Footer />
      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </main>
  );
}

// ── Coaching CTA banner — sits between FAQ and waitlist ──────────
function CoachingCta({ onBook }: { onBook: () => void }) {
  return (
    <section
      id="coaching-cta"
      className="relative z-10 px-5 sm:px-8 py-20 border-t border-white/5"
    >
      <div className="relative max-w-6xl mx-auto overflow-hidden rounded-3xl border border-[#3b82f6]/30 bg-[#02040a]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.22),transparent_60%)]"
        />

        <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] items-center gap-10 px-6 sm:px-10 py-14 sm:py-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/30 bg-[#3b82f6]/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] font-bold text-[#60a5fa] mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse" />
              1-on-1 with Banjo
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-[1.05]">
              Want to talk it through?
              <br />
              <span className="bg-gradient-to-br from-[#60a5fa] via-[#3b82f6] to-[#1d4ed8] bg-clip-text text-transparent">
                Book a 30-minute chat.
              </span>
            </h2>
            <p className="mt-5 max-w-xl text-base sm:text-lg text-[#94a3b8] leading-relaxed">
              Tips, insights, and the parts of every paid course that actually
              matter — distilled into a 30-minute call. Not a sales pitch, not
              a Discord plug. Your first session is free.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center sm:items-start gap-3">
              <button
                type="button"
                onClick={onBook}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-semibold px-6 py-3 rounded-md shadow-lg shadow-[#3b82f6]/30 transition-all hover:shadow-[#3b82f6]/50"
              >
                Pick a time
                <span aria-hidden>→</span>
              </button>
              <Link
                href="/landing/coaching"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/30 text-white text-sm font-semibold px-6 py-3 rounded-md transition-colors"
              >
                Learn more
              </Link>
            </div>
            <p className="mt-4 text-[11px] text-[#475569]">
              Free first 30 minutes for every TraderM8 account · Mon–Sun, 9am–7pm London time
            </p>
          </div>

          <div className="hidden lg:block">
            <div className="rounded-2xl border border-white/10 bg-[#0a0e17] px-7 py-6 text-center min-w-[220px]">
              <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#3b82f6]">
                Hours studied
              </div>
              <div className="mt-2 text-5xl font-bold text-white tracking-tight">
                500+
              </div>
              <div className="mt-1 text-xs text-[#64748b]">
                of paid courses, sorted
              </div>
              <div className="mt-5 pt-5 border-t border-white/10">
                <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#3b82f6]">
                  First session
                </div>
                <div className="mt-2 text-3xl font-bold text-white">Free</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Hero — scroll-driven 3D animation ────────────────────────────
function Hero() {
  return (
    <section className="relative z-10 px-5 sm:px-8 pt-2 sm:pt-4">
      <ContainerScroll
        titleComponent={
          <>
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
              TraderM8 is the trading dashboard built for the way you actually
              trade. Bias cards, session levels, liquidity heatmaps, a journal
              that tells the truth, and a position calculator that pops out
              next to your charts.
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
              Free for life — first 100 traders only · No card required · Paid
              plans after
            </p>
          </>
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/landing/dashboard.png"
          alt="TraderM8 dashboard with charts, bias cards, and countdown"
          className="w-full h-full object-cover object-left-top rounded-2xl"
          draggable={false}
        />
      </ContainerScroll>
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

// ── Reviews — two infinite-scroll marquee rows ────────────────────
const REVIEWS_TOP = [
  {
    quote:
      "Asia high gets drawn before I even open my chart. Don't know how I traded without this.",
    name: "Maya R.",
    role: "Crypto trader",
  },
  {
    quote:
      "The journal alone made me realise I lose 70% of trades after Wednesday lunch. Game over for that habit.",
    name: "Dan T.",
    role: "Funded futures trader",
  },
  {
    quote:
      "Pop-out calc on monitor 2 is a dream. Three inputs and I'm sized.",
    name: "Ari S.",
    role: "NQ scalper",
  },
  {
    quote:
      "Bias cards saved me from at least four revenge trades last week. Whole reason I joined.",
    name: "Liam K.",
    role: "FX swing trader",
  },
  {
    quote:
      "The seasonality charts changed how I plan my month. Didn't know April was this bullish on NQ.",
    name: "Priya N.",
    role: "Day trader",
  },
];

const REVIEWS_BOTTOM = [
  {
    quote:
      "Built like Linear, runs like Linear. Compared to Tradezella this feels ten years newer.",
    name: "Jordan B.",
    role: "Prop firm trader",
  },
  {
    quote:
      "Liquidity heatmap caught a sweep on EU last Tuesday I never would've seen. Closed +3R.",
    name: "Sebastian C.",
    role: "Forex trader",
  },
  {
    quote:
      "Banjo actually replies to feedback. Already shipped two of my Discord requests.",
    name: "Frankie C.",
    role: "Crypto + futures",
  },
  {
    quote:
      "Used to keep my plan in Notion. Now it lives one tab away from my chart and I actually read it.",
    name: "Tony V.",
    role: "Index futures",
  },
  {
    quote:
      "Not another Discord telling me to buy. Tools that actually do work.",
    name: "Marley K.",
    role: "ICT trader",
  },
];

function Reviews() {
  return (
    <section
      id="reviews"
      className="relative z-10 py-24 border-t border-white/5"
    >
      <style>{`
        @keyframes m8-scroll-right {
          from { transform: translate3d(-50%, 0, 0); }
          to   { transform: translate3d(0, 0, 0); }
        }
        @keyframes m8-scroll-left {
          from { transform: translate3d(0, 0, 0); }
          to   { transform: translate3d(-50%, 0, 0); }
        }
        .m8-marquee { width: max-content; will-change: transform; }
        .m8-marquee-row:hover .m8-marquee { animation-play-state: paused; }
      `}</style>

      <div className="px-5 sm:px-8 mb-12">
        <SectionHeader
          eyebrow="Reviews"
          title="Words from our current beta testers."
          subtitle="What real users are saying after a few weeks inside the dashboard."
        />
      </div>

      {/* Top row scrolls right */}
      <MarqueeRow reviews={REVIEWS_TOP} direction="right" />
      <div className="h-3" />
      {/* Bottom row scrolls left */}
      <MarqueeRow reviews={REVIEWS_BOTTOM} direction="left" />
    </section>
  );
}

function MarqueeRow({
  reviews,
  direction,
}: {
  reviews: { quote: string; name: string; role: string }[];
  direction: "left" | "right";
}) {
  // Duplicate the list so the loop seam is invisible.
  const doubled = [...reviews, ...reviews];
  const animation = direction === "right" ? "m8-scroll-right" : "m8-scroll-left";
  return (
    <div className="m8-marquee-row relative w-full overflow-hidden">
      {/* Edge fade so cards dissolve in/out of the viewport */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-[#05070d] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-[#05070d] to-transparent"
      />
      <div
        className="m8-marquee flex gap-4 px-2"
        style={{ animation: `${animation} 60s linear infinite` }}
      >
        {doubled.map((r, i) => (
          <ReviewCard key={`${direction}-${i}`} {...r} />
        ))}
      </div>
    </div>
  );
}

function ReviewCard({
  quote,
  name,
  role,
}: {
  quote: string;
  name: string;
  role: string;
}) {
  return (
    <div className="shrink-0 w-[320px] sm:w-[360px] rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 hover:border-[#3b82f6]/40 transition-colors">
      <p className="text-sm text-[#e2e8f0] leading-relaxed">&ldquo;{quote}&rdquo;</p>
      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{name}</div>
          <div className="text-[11px] text-[#64748b]">{role}</div>
        </div>
        <div className="text-[#3b82f6] text-xs font-bold">★★★★★</div>
      </div>
    </div>
  );
}

// ── Founder note — bigger, two-column ─────────────────────────────
function FounderNote({ onBook }: { onBook: () => void }) {
  return (
    <section id="about" className="relative z-10 px-5 sm:px-8 py-24 border-t border-white/5">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,400px)_1fr] gap-10 lg:gap-16 items-center">
        {/* Founder photo */}
        <div className="relative">
          <div className="aspect-[4/5] rounded-2xl border border-white/10 overflow-hidden bg-[#0a0e17]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing/IMG_1391.JPG"
              alt="Banjo Tomlinson, founder of TraderM8"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          {/* Subtle glow behind the frame */}
          <div
            aria-hidden
            className="absolute -inset-4 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.18),transparent_60%)] blur-2xl"
          />
        </div>

        {/* Right side — story + socials */}
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[#3b82f6] mb-3">
            Meet the founder
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
            Built by a trader who&apos;s done the reps.
          </h2>
          <p className="mt-5 text-base text-[#94a3b8] leading-relaxed">
            <strong className="text-white">Banjo Tomlinson</strong>{" "}
            has spent years inside the charts and hundreds of hours inside the
            courses — ICT, SMC, the prop-firm playbooks, the volume-profile
            crowd, the algo guys. He built TraderM8 because none of the
            tools out there did the job he needed: clean bias, real session
            levels, sizing in three inputs, a journal that actually tells the
            truth.
          </p>
          <p className="mt-4 text-base text-[#e2e8f0] leading-relaxed border-l-2 border-[#3b82f6]/40 pl-5 italic">
            &ldquo;I&apos;ve sat through every course you&apos;re thinking of
            buying. I know what works, what&apos;s recycled, and what&apos;s
            outright noise. TraderM8 is the toolkit I wish I&apos;d had on day
            one — and the conversations I have with traders are how I pass on
            everything those courses charge thousands for.&rdquo;
          </p>
          <div className="mt-7 rounded-xl border border-[#3b82f6]/20 bg-[#3b82f6]/[0.06] p-5">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-[#3b82f6]/15 border border-[#3b82f6]/25 flex items-center justify-center text-[#60a5fa] text-lg">
                💬
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white">1-on-1 Chat with Banjo</h3>
                <p className="mt-1 text-sm text-[#94a3b8] leading-relaxed">
                  30 minutes, no sales pitch. Tell Banjo where you&apos;re stuck, what courses you&apos;re considering, or what&apos;s not clicking. First session is free for every TraderM8 account.
                </p>
                <button
                  type="button"
                  onClick={onBook}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
                >
                  Book your free session
                  <span aria-hidden>&rarr;</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#3b82f6] flex items-center justify-center text-white font-bold">
                B
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Banjo Tomlinson</div>
                <div className="text-xs text-[#64748b]">Founder · TraderM8</div>
              </div>
            </div>
            <span className="hidden sm:inline-block w-px h-8 bg-white/10" />
            <a
              href="https://www.instagram.com/traderm8.offical/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-white/10 hover:border-[#3b82f6]/50 hover:bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-white transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              Instagram
              <span aria-hidden>&rarr;</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Custom dropdown ───────────────────────────────────────────────
function CustomSelect({
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="block">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider font-bold text-[#94a3b8]">
          {label}
        </span>
        <span className="text-[10px] text-[#3b82f6]">required</span>
      </div>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center justify-between bg-[#0a0e17] border rounded-lg px-4 py-3 text-sm text-left transition-colors ${
            open
              ? "border-[#3b82f6] ring-1 ring-[#3b82f6]/30"
              : "border-white/10 hover:border-white/20"
          }`}
        >
          <span className={selected ? "text-white" : "text-[#475569]"}>
            {selected ? selected.label : placeholder}
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={`text-[#64748b] transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {open && (
          <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-white/10 bg-[#0a0e17] shadow-2xl shadow-black/50 overflow-hidden">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                  opt.value === value
                    ? "bg-[#3b82f6]/15 text-[#60a5fa]"
                    : "text-[#e2e8f0] hover:bg-white/[0.05]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Waitlist form ─────────────────────────────────────────────────
function Waitlist() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [primaryAsset, setPrimaryAsset] = useState("");
  const [experience, setExperience] = useState("");
  const [painPoint, setPainPoint] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "err">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [alreadyJoined, setAlreadyJoined] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!primaryAsset) {
      setStatus("err");
      setErrorMsg("Select what you mainly trade");
      return;
    }
    if (!experience) {
      setStatus("err");
      setErrorMsg("Select your trading experience");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          primary_asset: primaryAsset,
          experience,
          pain_point: painPoint,
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
      setErrorMsg("Network error. Try again in a moment.");
    }
  }

  if (status === "ok") {
    return (
      <section id="waitlist" className="relative z-10 px-5 sm:px-8 py-24">
        <div className="max-w-md mx-auto text-center rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/[0.06] p-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 mb-4">
            <span className="text-2xl text-[#22c55e]">&#10003;</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {alreadyJoined ? "You're already on the list." : "You're on the list."}
          </h2>
          <p className="text-sm text-[#94a3b8]">
            {alreadyJoined
              ? "Sit tight. We'll email when your spot opens up."
              : "We'll send you an invite when the closed beta opens. Keep an eye on your inbox."}
          </p>
          {!alreadyJoined && (
            <p className="mt-4 text-xs text-[#475569]">
              Can&apos;t find the email? Check your junk or spam folder.
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section id="waitlist" className="relative z-10 px-5 sm:px-8 py-24 border-t border-white/5">
      <div className="max-w-xl mx-auto">
        <SectionHeader
          eyebrow="Closed beta"
          title="Get early access."
          subtitle="The first 100 traders to join lock in free-for-life access. Everyone else lands on a paid plan when the public launch goes live."
        />
        <form
          onSubmit={submit}
          className="mt-12 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 sm:p-8 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name" required>
              <input
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First and last name"
                minLength={2}
                maxLength={120}
                className="w-full bg-[#0a0e17] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30 transition-colors"
              />
            </Field>

            <Field label="Email" required>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@trader.com"
                className="w-full bg-[#0a0e17] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30 transition-colors"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomSelect
              label="What do you mainly trade?"
              value={primaryAsset}
              onChange={setPrimaryAsset}
              placeholder="Choose one"
              options={[
                { value: "futures", label: "Index futures (NQ, ES, etc.)" },
                { value: "forex", label: "Forex" },
                { value: "crypto", label: "Crypto" },
                { value: "commodities", label: "Commodities (Gold, Oil, etc.)" },
                { value: "stocks", label: "Stocks / Indices" },
                { value: "all", label: "A bit of everything" },
              ]}
            />

            <CustomSelect
              label="How long have you been trading?"
              value={experience}
              onChange={setExperience}
              placeholder="Choose one"
              options={[
                { value: "<1y", label: "Less than a year" },
                { value: "1-3y", label: "1-3 years" },
                { value: "3-5y", label: "3-5 years" },
                { value: "5+y", label: "5+ years" },
              ]}
            />
          </div>

          <Field label="Biggest pain point right now?" required>
            <textarea
              required
              value={painPoint}
              onChange={(e) => setPainPoint(e.target.value)}
              rows={3}
              placeholder="e.g. juggling tabs, journaling consistency, missing news, sizing mistakes..."
              minLength={3}
              maxLength={1000}
              className="w-full bg-[#0a0e17] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30 resize-y transition-colors"
            />
          </Field>

          {status === "err" && (
            <div className="rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 px-4 py-3 text-sm text-[#ef4444]">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white text-sm font-semibold px-6 py-3.5 rounded-lg shadow-lg shadow-[#3b82f6]/25 transition-all hover:shadow-[#3b82f6]/40"
          >
            {status === "submitting" ? "Submitting..." : "Reserve my spot"}
          </button>

          <p className="text-center text-[11px] text-[#475569]">
            Free for life for the first 100. No card required.
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
