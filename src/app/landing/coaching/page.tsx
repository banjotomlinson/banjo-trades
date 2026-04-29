"use client";

import { useState } from "react";
import Link from "next/link";
import { BgEffects, Footer, Nav } from "../_components";
import BookingModal from "../_booking-modal";

export default function CoachingPage() {
  const [open, setOpen] = useState(false);
  return (
    <main className="min-h-screen overflow-x-clip">
      <BgEffects />
      <Nav />

      {/* Hero */}
      <section
        id="book"
        className="relative z-10 px-5 sm:px-8 pt-24 sm:pt-28 pb-16 max-w-5xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/30 bg-[#3b82f6]/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] font-bold text-[#60a5fa] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse" />
          1-on-1 with Banjo
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-tight leading-[1.05]">
          A 30-minute call.
          <br />
          <span className="bg-gradient-to-br from-[#60a5fa] via-[#3b82f6] to-[#1d4ed8] bg-clip-text text-transparent">
            None of the upsell.
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[#94a3b8] leading-relaxed">
          Tips, insights, and the parts of every paid course that actually
          matter — distilled into a single 30-minute call. Not a sales pitch,
          not a Discord plug, no &ldquo;membership&rdquo; at the end.
          <span className="text-white"> Your first session is free.</span>
        </p>
        <div className="mt-9 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-semibold px-7 py-3.5 rounded-md shadow-lg shadow-[#3b82f6]/30 transition-all hover:shadow-[#3b82f6]/50"
          >
            Pick a time
            <span aria-hidden>→</span>
          </button>
          <Link
            href="/landing#waitlist"
            className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/30 text-white text-sm font-semibold px-7 py-3.5 rounded-md transition-colors"
          >
            Back to TraderM8
          </Link>
        </div>
      </section>

      {/* Three-up of what gets covered */}
      <section className="relative z-10 px-5 sm:px-8 py-16 max-w-5xl mx-auto">
        <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[#3b82f6] mb-3">
          What we&rsquo;ll cover
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight max-w-3xl">
          Bring whatever&rsquo;s in your way. We&rsquo;ll work on it together.
        </h2>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "Reading the chart",
              body:
                "Bias, structure, liquidity, sessions. Where price is being drawn and why. ICT and SMC translated into something you can actually use Monday morning.",
            },
            {
              title: "Building a system",
              body:
                "Entry rules, sizing, where the stop goes, when you&rsquo;re allowed to take the trade. The boring scaffolding that turns guesswork into a process.",
            },
            {
              title: "The mental side",
              body:
                "Tilt, revenge trades, FOMO, the days you can&rsquo;t leave the screen. The patterns I&rsquo;ve seen blow up dozens of accounts (mine included) — and how to spot yours early.",
            },
          ].map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
            >
              <div className="text-base font-bold text-white mb-2">
                {c.title}
              </div>
              <p
                className="text-sm text-[#94a3b8] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: c.body }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Founder block */}
      <section className="relative z-10 px-5 sm:px-8 py-16 border-t border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr] gap-10 lg:gap-14 items-center">
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
            <div
              aria-hidden
              className="absolute -inset-4 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.18),transparent_60%)] blur-2xl"
            />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[#3b82f6] mb-3">
              Who you&rsquo;re actually talking to
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
              Banjo Tomlinson — trader, builder, mate of the market.
            </h2>
            <p className="mt-5 text-base text-[#94a3b8] leading-relaxed">
              500+ hours sat through every paid course you&rsquo;re thinking of
              buying — ICT, SMC, the prop-firm playbooks, the volume-profile
              crowd, the algo guys. I&rsquo;ve sorted what works from
              what&rsquo;s recycled noise.
            </p>
            <p className="mt-4 text-base text-[#e2e8f0] leading-relaxed border-l-2 border-[#3b82f6]/40 pl-5 italic">
              &ldquo;I built TraderM8 because the tools out there didn&rsquo;t
              do the job I needed. The calls are the same idea — pass on what
              the courses charge thousands for, in 30 minutes, free.&rdquo;
            </p>
            <div className="mt-7 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#3b82f6] flex items-center justify-center text-white font-bold">
                  B
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    Banjo Tomlinson
                  </div>
                  <div className="text-xs text-[#64748b]">
                    Founder · TraderM8
                  </div>
                </div>
              </div>
              <span className="hidden sm:inline-block w-px h-8 bg-white/10" />
              <a
                href="https://www.instagram.com/traderm8.offical/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-white/10 hover:border-[#3b82f6]/50 hover:bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-white transition-colors"
              >
                Instagram <span aria-hidden>→</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 px-5 sm:px-8 py-16 max-w-5xl mx-auto">
        <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[#3b82f6] mb-3">
          How it works
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight max-w-3xl">
          Four steps from booking to back at your charts.
        </h2>
        <ol className="mt-10 space-y-4">
          {[
            {
              n: "01",
              t: "Pick a slot",
              b: "30-minute slots, 9:00–19:00 London time, every weekday and weekend. Use the popup picker — it shows the times in your timezone automatically.",
            },
            {
              n: "02",
              t: "Drop a few notes",
              b: "Topic is optional. If you want, write down what you&rsquo;d like to walk through — a chart, a rule you keep breaking, a bias you can&rsquo;t shake.",
            },
            {
              n: "03",
              t: "I send the link",
              b: "You&rsquo;ll get a confirmation email immediately, then the meeting link from me before the slot. No download, just a video call.",
            },
            {
              n: "04",
              t: "We talk",
              b: "30 minutes, focused on you. If we run over, we run over. No upsell, no follow-up sales call.",
            },
          ].map((s) => (
            <li
              key={s.n}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 flex items-start gap-5"
            >
              <div className="text-2xl sm:text-3xl font-bold text-[#3b82f6] tabular-nums shrink-0 w-12">
                {s.n}
              </div>
              <div>
                <div className="text-base font-bold text-white">{s.t}</div>
                <p
                  className="mt-1.5 text-sm text-[#94a3b8] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: s.b }}
                />
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-5 sm:px-8 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-[1.05]">
            Ready when you are.
          </h2>
          <p className="mt-5 text-base sm:text-lg text-[#94a3b8] leading-relaxed">
            Free first session. 30 minutes. No card, no follow-up sales pitch.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-semibold px-7 py-3.5 rounded-md shadow-lg shadow-[#3b82f6]/30 transition-all hover:shadow-[#3b82f6]/50"
            >
              Pick a time
              <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      </section>

      <Footer />

      <BookingModal open={open} onClose={() => setOpen(false)} />
    </main>
  );
}
