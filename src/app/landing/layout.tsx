import type { Metadata } from "next";

// Stripped-down layout for the marketing landing page — no sidebar, no
// providers needed. The root layout already supplies html/body + globals.css.

export const metadata: Metadata = {
  title: "TraderM8 — Your mate of the market",
  description:
    "The trading dashboard built the way traders actually trade. Bias cards, session levels, liquidity heatmaps, journaling, planner — wrapped in a single dark, fast UI.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-[#05070d] text-[#e2e8f0]">{children}</div>;
}
