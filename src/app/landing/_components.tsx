"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Background, nav, footer, screenshot frame, and the Spotlight block are
// all shared between the marketing landing page and the dedicated features
// page. Keep them in this single underscore-prefixed module so neither
// path becomes its own route.

// ── Background gradient blobs ─────────────────────────────────────
export function BgEffects() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[1100px] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.18),transparent_60%)]" />
      <div className="absolute top-[60vh] -right-40 w-[700px] h-[700px] bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.10),transparent_60%)]" />
      <div className="absolute top-[120vh] -left-40 w-[700px] h-[700px] bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent,#05070d_70%)]" />
    </div>
  );
}

// ── Logo ──────────────────────────────────────────────────────────
export function Logo({ size = "default" }: { size?: "default" | "lg" }) {
  const c =
    size === "lg" ? "text-3xl tracking-tight" : "text-base tracking-tight";
  return (
    <span className={`font-bold text-white ${c}`}>
      Trader<span className="text-[#3b82f6]">M8</span>
    </span>
  );
}

// ── Top nav ───────────────────────────────────────────────────────
// Anchor links use absolute paths so they resolve from any landing route
// (e.g. /landing/features clicking "FAQs" jumps back to /landing#faq).
// Mobile (< md) gets a hamburger that opens a full-screen animated panel
// with the same links + an Early Access CTA at the bottom.
export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (menuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [menuOpen]);

  return (
    <>
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#05070d]/70 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2">
            <Logo />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#94a3b8]">
            <Link href="/landing#reviews" className="hover:text-white transition-colors">
              Reviews
            </Link>
            <Link href="/landing/features" className="hover:text-white transition-colors">
              Features
            </Link>
            <Link href="/landing#faq" className="hover:text-white transition-colors">
              FAQs
            </Link>
          </div>
          {/* Desktop CTA */}
          <Link
            href="/landing#waitlist"
            className="hidden md:inline-flex items-center gap-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
          >
            Get early access
            <span aria-hidden>→</span>
          </Link>
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md text-white hover:bg-white/5 transition-colors"
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="3" y1="7" x2="21" y2="7" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="17" x2="21" y2="17" />
            </svg>
          </button>
        </div>
      </nav>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const items = [
    { href: "/landing#reviews", label: "Reviews" },
    { href: "/landing/features", label: "Features" },
    { href: "/landing#faq", label: "FAQs" },
  ];
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mobile-menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="md:hidden fixed inset-0 z-[60] bg-[#05070d]"
          role="dialog"
          aria-modal="true"
        >
          {/* Top bar inside the menu — logo + close */}
          <div className="px-5 h-16 flex items-center justify-between border-b border-white/5">
            <Logo />
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center w-10 h-10 rounded-md text-white hover:bg-white/5 transition-colors"
              aria-label="Close menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            </button>
          </div>

          {/* Big nav links — staggered fade/slide in */}
          <nav className="flex-1 flex flex-col items-center justify-center gap-7 px-6 py-10 h-[calc(100vh-4rem-7rem)]">
            {items.map((item, i) => (
              <motion.div
                key={item.href}
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.08 + i * 0.05, duration: 0.22 }}
              >
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="text-3xl font-semibold tracking-tight text-white hover:text-[#3b82f6] transition-colors"
                >
                  {item.label}
                </Link>
              </motion.div>
            ))}
          </nav>

          {/* CTA pinned to the bottom */}
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.22, duration: 0.25 }}
            className="absolute bottom-0 left-0 right-0 px-6 pb-8 pt-5 border-t border-white/5"
          >
            <Link
              href="/landing#waitlist"
              onClick={onClose}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-base font-semibold px-6 py-4 rounded-md shadow-lg shadow-[#3b82f6]/25 transition-all"
            >
              Get early access
              <span aria-hidden>→</span>
            </Link>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Section header (eyebrow + title + subtitle) ──────────────────
export function SectionHeader({
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
export function Spotlight({
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

// ── Browser-frame wrapper for screenshots ─────────────────────────
export function BrowserFrame({
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
export function Screenshot({
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
export function ScreenshotPlaceholder({
  label,
  sub,
}: {
  label: string;
  sub?: string;
}) {
  return (
    <div className="relative aspect-[16/10] w-full bg-[#0a0e17] flex items-center justify-center overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08),transparent_60%)]" />
      <div className="relative text-center px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-wider font-bold text-[#3b82f6] mb-3">
          <span aria-hidden>🖼️</span>
          Image placeholder
        </div>
        <div className="text-white text-sm sm:text-base font-semibold">{label}</div>
        {sub && (
          <div className="text-[#64748b] text-xs sm:text-sm mt-1">{sub}</div>
        )}
        <div className="text-[10px] text-[#475569] mt-3">drop a screenshot at this slot</div>
      </div>
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────
export function Footer() {
  return (
    <footer className="relative z-10 px-5 sm:px-8 pt-16 pb-10 border-t border-white/5">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start justify-between gap-6">
        <div>
          <Logo size="lg" />
          <p className="mt-2 text-sm text-[#64748b]">Your mate of the market.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-x-10 gap-y-3 text-sm text-[#64748b]">
          <Link href="/landing#reviews" className="hover:text-white transition-colors">
            Reviews
          </Link>
          <Link href="/landing/features" className="hover:text-white transition-colors">
            Features
          </Link>
          <Link href="/landing#faq" className="hover:text-white transition-colors">
            FAQs
          </Link>
          <Link href="/landing#waitlist" className="hover:text-white transition-colors">
            Waitlist
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

// ── Spotlights data — single source for both pages ────────────────
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
