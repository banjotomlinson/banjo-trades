"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { useSidebar } from "@/components/providers/SidebarProvider";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "⊞", href: "/" },
  { id: "calendar", label: "Calendar", icon: "📅", href: "/calendar" },
  { id: "news", label: "News", icon: "📰", href: "/news" },
  { id: "setups", label: "Setups", icon: "🎯", href: "/setups" },
  { id: "liquidity", label: "Liquidity", icon: "💧", href: "/liquidity" },
  { id: "journal", label: "Journal", icon: "📓", href: "/journal" },
];

export default function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  const [user, setUser] = useState<User | null>(null);
  const [showProfile, setShowProfile] = useState(false);
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
      {/* Backdrop on mobile when expanded */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={toggle}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col bg-[#0b1120] border-r border-[#1e293b] transition-all duration-300 ${
          collapsed ? "w-[60px]" : "w-[240px]"
        }`}
      >
        {/* Logo / toggle */}
        <div className="flex items-center h-16 px-3 border-b border-[#1e293b]">
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-lg bg-[#111827] border border-[#1e293b] text-[#3b82f6] flex items-center justify-center hover:bg-[#1e293b] transition-colors text-lg font-bold shrink-0"
          >
            {collapsed ? "›" : "‹"}
          </button>
          {!collapsed && (
            <span className="ml-3 text-base font-bold text-white whitespace-nowrap">
              Banjo <span className="text-[#3b82f6]">Trades</span>
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                  active
                    ? "bg-[#3b82f6]/10 text-[#3b82f6]"
                    : "text-[#64748b] hover:text-[#e2e8f0] hover:bg-white/[0.03]"
                }`}
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

        {/* Bottom: settings + profile */}
        <div className="border-t border-[#1e293b] p-2 space-y-1">
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              pathname === "/settings"
                ? "bg-[#3b82f6]/10 text-[#3b82f6]"
                : "text-[#64748b] hover:text-[#e2e8f0] hover:bg-white/[0.03]"
            }`}
            title={collapsed ? "Settings" : undefined}
          >
            <span className="text-base w-5 h-5 leading-5 text-center shrink-0 grow-0">&#9881;</span>
            {!collapsed && <span className="text-sm font-medium">Settings</span>}
          </Link>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#94a3b8] hover:bg-white/[0.03] transition-all"
              title={collapsed ? name : undefined}
            >
              {avatar ? (
                <img src={avatar} alt="" className="w-7 h-7 min-w-[28px] min-h-[28px] max-w-[28px] max-h-[28px] rounded-full shrink-0 grow-0 object-cover border border-[#334155]" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#3b82f6] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {initials}
                </div>
              )}
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-medium text-[#e2e8f0] truncate">{name}</div>
                  <div className="text-[10px] text-[#475569] truncate">{user?.email}</div>
                </div>
              )}
            </button>

            {showProfile && (
              <>
                <div className="fixed inset-0 z-50" onClick={() => setShowProfile(false)} />
                <div
                  className={`absolute z-50 bottom-full mb-2 bg-[#111827] border border-[#1e293b] rounded-xl shadow-xl overflow-hidden ${
                    collapsed ? "left-full ml-2 w-48" : "left-0 w-full"
                  }`}
                >
                  <div className="px-4 py-3 border-b border-[#1e293b]">
                    <p className="text-sm font-medium text-white truncate">{name}</p>
                    <p className="text-[11px] text-[#64748b] truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2.5 text-sm text-[#94a3b8] hover:bg-white/[0.04] hover:text-white transition-colors"
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
