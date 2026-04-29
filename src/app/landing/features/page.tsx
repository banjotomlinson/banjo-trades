import Link from "next/link";
import type { Metadata } from "next";
import {
  BgEffects,
  Footer,
  Nav,
  SectionHeader,
  Spotlight,
} from "../_components";
import { SPOTLIGHTS } from "../_spotlights";

export const metadata: Metadata = {
  title: "Features · TraderM8",
  description:
    "Every TraderM8 feature in detail — bias cards, session levels, liquidity heatmap, position calculator, journal, planner, calendar, market movers, seasonality.",
};

export default function FeaturesPage() {
  return (
    <main className="min-h-screen overflow-x-clip">
      <BgEffects />
      <Nav />

      <section className="relative z-10 px-5 sm:px-8 pt-24 pb-12 sm:pt-32 sm:pb-16">
        <SectionHeader
          eyebrow="The full toolkit"
          title="Every feature, in detail."
          subtitle="Eight panels that wrap your bias, your levels, your sizing, your journal, and your daily plan into one fast UI. Scroll through, screenshots and all."
        />
      </section>

      {SPOTLIGHTS.map((s, i) => (
        <Spotlight
          key={s.eyebrow}
          eyebrow={s.eyebrow}
          title={s.title}
          body={s.body}
          bullets={s.bullets}
          image={s.image}
          placeholder={s.placeholder}
          flip={i % 2 === 1}
        />
      ))}

      {/* Bottom CTA back to waitlist */}
      <section className="relative z-10 px-5 sm:px-8 py-24 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Like what you see?
          </h2>
          <p className="mt-4 text-base text-[#94a3b8] leading-relaxed">
            Free for the first 100 traders. Lock in your spot before the door
            closes — paid plans take over after that.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/landing#waitlist"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-semibold px-6 py-3 rounded-md shadow-lg shadow-[#3b82f6]/25 transition-all hover:shadow-[#3b82f6]/40"
            >
              Join the waitlist
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/landing"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-white text-sm font-semibold px-6 py-3 rounded-md transition-colors"
            >
              Back to overview
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
