"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Items in priority order — earlier items appear first as screen widens.
// visibleFrom: minimum viewport width (px) at which this tab shows in the bar.
// Items that don't fit always go into the More drawer.
const ALL_ITEMS = [
  { id: "calendar",    label: "Calendar", icon: "📅", href: "/calendar",    visibleFrom: 0   },
  { id: "movers",      label: "Movers",   icon: "📈", href: "/movers",      visibleFrom: 0   },
  { id: "planner",     label: "Planner",  icon: "🗒️", href: "/planner",     visibleFrom: 0   },
  { id: "journal",     label: "Journal",  icon: "📓", href: "/journal",     visibleFrom: 420 },
  { id: "dashboard",   label: "Home",     icon: "⊞", href: "/",            visibleFrom: 520 },
  { id: "seasonality", label: "Season",   icon: "🍂", href: "/seasonality", visibleFrom: 620 },
  { id: "liquidity",   label: "Liquid",   icon: "💧", href: "/liquidity",   visibleFrom: 700 },
];

const DRAWER_ONLY = [
  { id: "feedback", label: "Feedback", icon: "💬", href: "/feedback" },
  { id: "settings", label: "Settings", icon: "⚙️", href: "/settings" },
];

// Tailwind class to show/hide based on visibleFrom breakpoint
function showClass(px: number): string {
  if (px === 0)   return "flex";
  if (px <= 420)  return "hidden min-[420px]:flex";
  if (px <= 520)  return "hidden min-[520px]:flex";
  if (px <= 620)  return "hidden min-[620px]:flex";
  return           "hidden min-[700px]:flex";
}

export default function BottomNav() {
  const { theme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const moreIsActive = [...ALL_ITEMS.filter(i => i.visibleFrom > 0), ...DRAWER_ONLY]
    .some((item) => isActive(item.href));

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const drawerItems = [...ALL_ITEMS.filter(i => i.visibleFrom > 0), ...DRAWER_ONLY];

  return (
    <>
      {/* Drawer backdrop */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More drawer — slides up from bottom bar */}
      {moreOpen && (
        <div
          className="fixed bottom-[60px] left-0 right-0 z-50 rounded-t-2xl shadow-2xl overflow-hidden md:hidden"
          style={{ background: theme.panelBg, borderTop: `1px solid ${theme.border}` }}
        >
          <div className="px-4 pt-4 pb-2 grid grid-cols-4 gap-3">
            {drawerItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
                  style={{
                    background: active ? `${theme.accent}1a` : theme.bg,
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
          <div className="px-4 pb-4 pt-1" style={{ borderTop: `1px solid ${theme.border}` }}>
            <button
              onClick={handleSignOut}
              className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold"
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
        {ALL_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex-1 flex-col items-center justify-center gap-0.5 relative transition-all ${showClass(item.visibleFrom)}`}
              style={{ color: active ? theme.accent : theme.textDim }}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[9px] font-semibold">{item.label}</span>
              {active && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                  style={{ background: theme.accent }}
                />
              )}
            </Link>
          );
        })}

        {/* More */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all"
          style={{ color: moreIsActive || moreOpen ? theme.accent : theme.textDim }}
        >
          <span className="text-lg leading-none font-bold">···</span>
          <span className="text-[9px] font-semibold">More</span>
          {(moreIsActive || moreOpen) && (
            <span
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
              style={{ background: theme.accent }}
            />
          )}
        </button>
      </nav>
    </>
  );
}
