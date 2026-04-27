"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { useSidebar } from "@/components/providers/SidebarProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import {
  useTradingMode,
  TRADING_MODES,
} from "@/components/providers/TradingModeProvider";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "⊞", href: "/" },
  { id: "calendar", label: "Economic Calendar", icon: "📅", href: "/calendar" },
  { id: "movers", label: "Market Movers", icon: "📈", href: "/movers" },
  { id: "seasonality", label: "Seasonality", icon: "🍂", href: "/seasonality" },
  { id: "liquidity", label: "Liquidity", icon: "💧", href: "/liquidity" },
  { id: "journal", label: "Journal", icon: "📓", href: "/journal" },
  { id: "planner", label: "Planner", icon: "🗒️", href: "/planner" },
  { id: "feedback", label: "Feedback", icon: "💬", href: "/feedback" },
];

export default function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  const { theme } = useTheme();
  const { mode, setMode, modeLabel, modeIcon } = useTradingMode();
  const [user, setUser] = useState<User | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showMode, setShowMode] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const avatar = user?.user_metadata?.avatar_url;
  const name = user?.user_metadata?.full_name || user?.email || "";
  const initials = name ? name[0].toUpperCase() : "?";

  return (
    <>
      {!collapsed && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={toggle}
        />
      )}

      <aside
        className="fixed top-0 left-0 h-full z-50 flex flex-col transition-all duration-300"
        style={{
          width: collapsed ? 60 : 240,
          background: theme.panelBg,
          borderRight: `1px solid ${theme.border}`,
        }}
      >
        {/* Logo / toggle */}
        <div
          className="flex items-center h-16 px-3"
          style={{ borderBottom: `1px solid ${theme.border}` }}
        >
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors text-lg font-bold shrink-0"
            style={{
              background: theme.bg,
              border: `1px solid ${theme.border}`,
              color: theme.accent,
            }}
          >
            {collapsed ? "\u203A" : "\u2039"}
          </button>
          {!collapsed && (
            <span className="ml-3 text-base font-bold whitespace-nowrap" style={{ color: theme.text }}>
              Trader<span style={{ color: theme.accent }}>M8</span>
            </span>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href) && item.href !== "/";
            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group"
                style={{
                  background: active ? `${theme.accent}1a` : "transparent",
                  color: active ? theme.accent : theme.textDim,
                }}
                title={collapsed ? item.label : undefined}
              >
                <span className="text-base w-5 h-5 leading-5 text-center shrink-0 grow-0">{item.icon}</span>
                {!collapsed && (
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: mode + settings + profile */}
        <div className="p-2 space-y-1" style={{ borderTop: `1px solid ${theme.border}` }}>
          {/* Trading mode selector */}
          <div className="relative">
            <button
              onClick={() => setShowMode(!showMode)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
              style={{
                background: showMode ? `${theme.accent}1a` : "transparent",
                color: showMode ? theme.accent : theme.textDim,
              }}
              title={collapsed ? `Mode: ${modeLabel}` : undefined}
            >
              <span className="text-base w-5 h-5 leading-5 text-center shrink-0 grow-0">
                {modeIcon}
              </span>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: theme.textDim }}>
                    Mode
                  </div>
                  <div className="text-sm font-medium truncate" style={{ color: theme.text }}>
                    {modeLabel}
                  </div>
                </div>
              )}
              {!collapsed && (
                <span className="text-xs shrink-0" style={{ color: theme.textDim }}>
                  ▾
                </span>
              )}
            </button>

            {showMode && (
              <>
                <div
                  className="fixed inset-0 z-50"
                  onClick={() => setShowMode(false)}
                />
                <div
                  className="absolute z-50 bottom-full mb-2 rounded-xl shadow-xl overflow-hidden"
                  style={{
                    left: collapsed ? "100%" : 0,
                    marginLeft: collapsed ? 8 : 0,
                    width: collapsed ? 200 : "100%",
                    background: theme.panelBg,
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  <div
                    className="px-3 py-2 text-[10px] uppercase tracking-wide font-semibold"
                    style={{
                      color: theme.textDim,
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    Trading Mode
                  </div>
                  {TRADING_MODES.map((m) => {
                    const active = mode === m.key;
                    return (
                      <button
                        key={m.key}
                        onClick={() => {
                          setMode(m.key);
                          setShowMode(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left"
                        style={{
                          background: active ? `${theme.accent}1a` : "transparent",
                          color: active ? theme.accent : theme.text,
                        }}
                      >
                        <span className="text-base w-5 text-center shrink-0">
                          {m.icon}
                        </span>
                        <span className="flex-1">{m.label}</span>
                        {active && (
                          <span className="text-xs">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
            style={{
              background: pathname === "/settings" ? `${theme.accent}1a` : "transparent",
              color: pathname === "/settings" ? theme.accent : theme.textDim,
            }}
            title={collapsed ? "Settings" : undefined}
          >
            <span className="text-base w-5 h-5 leading-5 text-center shrink-0 grow-0">&#9881;</span>
            {!collapsed && <span className="text-sm font-medium">Settings</span>}
          </Link>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
              style={{ color: theme.textDim }}
              title={collapsed ? name : undefined}
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  className="w-7 h-7 min-w-[28px] min-h-[28px] max-w-[28px] max-h-[28px] rounded-full shrink-0 grow-0 object-cover"
                  style={{ border: `1px solid ${theme.border}` }}
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: theme.accent }}
                >
                  {initials}
                </div>
              )}
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-medium truncate" style={{ color: theme.text }}>{name}</div>
                  <div className="text-[10px] truncate" style={{ color: theme.textDim }}>{user?.email}</div>
                </div>
              )}
            </button>

            {showProfile && (
              <>
                <div className="fixed inset-0 z-50" onClick={() => setShowProfile(false)} />
                <div
                  className="absolute z-50 bottom-full mb-2 rounded-xl shadow-xl overflow-hidden"
                  style={{
                    left: collapsed ? "100%" : 0,
                    marginLeft: collapsed ? 8 : 0,
                    width: collapsed ? 192 : "100%",
                    background: theme.panelBg,
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  <div className="px-4 py-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
                    <p className="text-sm font-medium truncate" style={{ color: theme.text }}>{name}</p>
                    <p className="text-[11px] truncate" style={{ color: theme.textDim }}>{user?.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                    style={{ color: theme.textDim }}
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
