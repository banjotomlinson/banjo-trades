"use client";

import { useState } from "react";

// ── Signal category definitions (matches SIGNAL_CATS from monolith) ──
const SIGNAL_CATEGORIES = [
  { key: "indices", label: "Indices", color: "#3b82f6" },
  { key: "futures", label: "Futures", color: "#f59e0b" },
  { key: "commodities", label: "Commodities", color: "#22c55e" },
  { key: "crypto", label: "Crypto", color: "#a855f7" },
  { key: "forex", label: "Forex", color: "#06b6d4" },
] as const;

export type SignalCategory = (typeof SIGNAL_CATEGORIES)[number]["key"];

// ── View tab definitions (Daily / Weekly / Monthly from monolith) ──
const VIEW_TABS = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
] as const;

export type ViewTab = (typeof VIEW_TABS)[number]["key"];

interface SignalTabsProps {
  /** Fires when the signal category changes (Indices, Futures, etc.) */
  onCategoryChange?: (category: SignalCategory) => void;
  /** Fires when the view tab changes (Daily, Weekly, Monthly) */
  onViewChange?: (view: ViewTab) => void;
  /** Initial active category */
  defaultCategory?: SignalCategory;
  /** Initial active view */
  defaultView?: ViewTab;
}

export default function SignalTabs({
  onCategoryChange,
  onViewChange,
  defaultCategory = "indices",
  defaultView = "daily",
}: SignalTabsProps) {
  const [activeCategory, setActiveCategory] =
    useState<SignalCategory>(defaultCategory);
  const [activeView, setActiveView] = useState<ViewTab>(defaultView);

  function handleCategoryClick(key: SignalCategory) {
    setActiveCategory(key);
    onCategoryChange?.(key);
  }

  function handleViewClick(key: ViewTab) {
    setActiveView(key);
    onViewChange?.(key);
  }

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
      {/* Signal category bar */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {SIGNAL_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => handleCategoryClick(cat.key)}
              className="rounded-lg px-[18px] py-1.5 text-xs font-bold tracking-wide transition-all duration-150 border"
              style={{
                background: isActive ? cat.color : "transparent",
                borderColor: isActive ? cat.color : "#334155",
                color: isActive ? "#fff" : "#64748b",
                letterSpacing: "0.3px",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = "#e2e8f0";
                  e.currentTarget.style.borderColor = "#64748b";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = "#64748b";
                  e.currentTarget.style.borderColor = "#334155";
                }
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* View tabs (Daily / Weekly / Monthly) */}
      <div
        className="flex gap-1 w-fit rounded-[10px] p-1 border border-[#1e293b]"
        style={{ background: "#111827" }}
      >
        {VIEW_TABS.map((tab) => {
          const isActive = activeView === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleViewClick(tab.key)}
              className={`rounded-lg px-5 py-2 text-[13px] font-semibold transition-all duration-150 border-none ${
                isActive
                  ? "bg-blue-500 text-white"
                  : "bg-transparent text-[#64748b] hover:text-[#e2e8f0]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
