"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const PRIMARY = [
  { id: "dashboard", label: "Home",     icon: "⊞", href: "/" },
  { id: "journal",   label: "Journal",  icon: "📓", href: "/journal" },
  { id: "planner",   label: "Planner",  icon: "🗒️", href: "/planner" },
  { id: "calendar",  label: "Calendar", icon: "📅", href: "/calendar" },
];

const MORE = [
  { id: "movers",      label: "Market Movers", icon: "📈", href: "/movers" },
  { id: "seasonality", label: "Seasonality",   icon: "🍂", href: "/seasonality" },
  { id: "liquidity",   label: "Liquidity",     icon: "💧", href: "/liquidity" },
  { id: "feedback",    label: "Feedback",       icon: "💬", href: "/feedback" },
  { id: "settings",    label: "Settings",       icon: "⚙️", href: "/settings" },
];

export default function BottomNav() {
  const { theme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const moreIsActive = MORE.some((item) => isActive(item.href));

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {/* More drawer backdrop */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More drawer */}
      {moreOpen && (
        <div
          className="fixed bottom-16 left-0 right-0 z-50 rounded-t-2xl shadow-2xl overflow-hidden"
          style={{ background: theme.panelBg, borderTop: `1px solid ${theme.border}` }}
        >
          <div className="px-4 py-3 grid grid-cols-4 gap-3">
            {MORE.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl transition-all"
                  style={{
                    background: active ? `${theme.accent}1a` : `${theme.bg}`,
                    border: `1px solid ${active ? theme.accent + "40" : theme.border}`,
                  }}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span
                    className="text-[10px] font-semibold text-center leading-tight"
                    style={{ color: active ? theme.accent : theme.textDim }}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
          <div
            className="px-4 pb-4"
            style={{ borderTop: `1px solid ${theme.border}` }}
          >
            <button
              onClick={handleSignOut}
              className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: theme.bg,
                border: `1px solid ${theme.border}`,
                color: theme.textDim,
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-stretch"
        style={{
          background: theme.panelBg,
          borderTop: `1px solid ${theme.border}`,
          height: 60,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {PRIMARY.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all"
              style={{ color: active ? theme.accent : theme.textDim }}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="text-[10px] font-semibold">{item.label}</span>
              {active && (
                <span
                  className="absolute bottom-0 w-8 h-0.5 rounded-full"
                  style={{ background: theme.accent }}
                />
              )}
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all"
          style={{ color: moreIsActive || moreOpen ? theme.accent : theme.textDim }}
        >
          <span className="text-xl leading-none">···</span>
          <span className="text-[10px] font-semibold">More</span>
          {(moreIsActive || moreOpen) && (
            <span
              className="absolute bottom-0 w-8 h-0.5 rounded-full"
              style={{ background: theme.accent }}
            />
          )}
        </button>
      </nav>
    </>
  );
}
