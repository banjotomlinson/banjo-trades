"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { useSidebar } from "@/components/providers/SidebarProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import {
  type ThemeColors,
  type PresetName,
  type PresetMeta,
  PRESETS,
  themeColorsToDbRow,
  detectActivePreset,
} from "@/lib/theme";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "⊞", href: "/" },
  { id: "calendar", label: "Calendar", icon: "📅", href: "/calendar" },
  { id: "news", label: "News", icon: "📰", href: "/news" },
  { id: "setups", label: "Setups", icon: "🎯", href: "/setups" },
  { id: "liquidity", label: "Liquidity", icon: "💧", href: "/liquidity" },
  { id: "journal", label: "Journal", icon: "📓", href: "/journal" },
];

interface ColorField {
  key: keyof ThemeColors;
  label: string;
  dot?: boolean;
}

interface AccordionSection {
  id: string;
  icon: string;
  title: string;
  fields: ColorField[];
}

const SECTIONS: AccordionSection[] = [
  {
    id: "bg",
    icon: "\u25D1",
    title: "Background",
    fields: [
      { key: "bg", label: "Page background" },
      { key: "panelBg", label: "Panel background" },
      { key: "border", label: "Borders" },
    ],
  },
  {
    id: "accents",
    icon: "\u25C6",
    title: "Accents",
    fields: [
      { key: "accent", label: "Primary" },
      { key: "bull", label: "Success" },
      { key: "bear", label: "Danger" },
      { key: "warn", label: "Warning" },
    ],
  },
  {
    id: "sessions",
    icon: "\u263C",
    title: "Sessions",
    fields: [
      { key: "asia", label: "Asia", dot: true },
      { key: "london", label: "London", dot: true },
      { key: "ny", label: "New York", dot: true },
    ],
  },
];

export default function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const router = useRouter();
  const pathname = usePathname();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const saveThemeToDb = useCallback(
    (colors: ThemeColors, presetName?: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const dbRow = themeColorsToDbRow(colors);
        const payload = {
          ...dbRow,
          preset: presetName || detectActivePreset(colors) || "custom",
        };
        try {
          await fetch("/api/theme", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch {
          // silent
        }
      }, 500);
    },
    []
  );

  const handlePreset = useCallback(
    (name: PresetName) => {
      const colors = { ...PRESETS[name].colors };
      setTheme(colors);
      saveThemeToDb(colors, name);
    },
    [setTheme, saveThemeToDb]
  );

  const handleColorChange = useCallback(
    (key: keyof ThemeColors, value: string) => {
      const next = { ...theme, [key]: value };
      setTheme(next);
      saveThemeToDb(next);
    },
    [theme, setTheme, saveThemeToDb]
  );

  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const activePreset = detectActivePreset(theme);
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
              Banjo <span style={{ color: theme.accent }}>Trades</span>
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

        {/* Bottom: settings + theme + profile */}
        <div className="p-2 space-y-1" style={{ borderTop: `1px solid ${theme.border}` }}>
          {/* Settings link */}
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

          {/* Theme toggle */}
          <button
            onClick={() => {
              if (collapsed) toggle();
              setShowTheme(!showTheme);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
            style={{
              background: showTheme ? `${theme.accent}1a` : "transparent",
              color: showTheme ? theme.accent : theme.textDim,
            }}
            title={collapsed ? "Theme" : undefined}
          >
            <span className="text-base w-5 h-5 leading-5 text-center shrink-0 grow-0">&#127912;</span>
            {!collapsed && <span className="text-sm font-medium">Theme</span>}
          </button>

          {/* Theme panel (inline, slides open) */}
          {showTheme && !collapsed && (
            <div
              className="rounded-lg overflow-hidden overflow-y-auto"
              style={{
                maxHeight: 360,
                background: theme.bg,
                border: `1px solid ${theme.border}`,
              }}
            >
              {/* Quick presets */}
              <div className="px-3 pt-3 pb-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.textDim }}>
                  Quick Themes
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.entries(PRESETS) as [PresetName, PresetMeta][]).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => handlePreset(key)}
                      className="flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer p-0"
                    >
                      <div
                        className="w-10 h-10 rounded-lg transition-all"
                        style={{
                          background: preset.gradient,
                          border: activePreset === key ? "2px solid #fff" : `2px solid ${theme.border}`,
                          transform: activePreset === key ? "scale(1.08)" : "scale(1)",
                        }}
                      />
                      <span
                        className="text-[9px] font-medium"
                        style={{ color: activePreset === key ? theme.text : theme.textDim }}
                      >
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colour sections */}
              <div className="px-2 pb-2 space-y-1">
                {SECTIONS.map((section) => {
                  const sectionOpen = openSections.has(section.id);
                  return (
                    <div
                      key={section.id}
                      className="rounded-md overflow-hidden"
                      style={{ border: `1px solid ${theme.border}` }}
                    >
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-transparent border-none cursor-pointer"
                        style={{ color: theme.text }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{section.icon}</span>
                          <span className="text-xs font-medium">{section.title}</span>
                        </div>
                        <span
                          className="text-[8px] transition-transform duration-200"
                          style={{
                            transform: sectionOpen ? "rotate(180deg)" : "rotate(0deg)",
                            color: theme.textDim,
                          }}
                        >
                          &#9660;
                        </span>
                      </button>

                      <div
                        className="transition-all duration-200 ease-in-out overflow-hidden"
                        style={{ maxHeight: sectionOpen ? 300 : 0, opacity: sectionOpen ? 1 : 0 }}
                      >
                        <div className="px-3 pb-2 flex flex-col gap-2" style={{ borderTop: `1px solid ${theme.border}` }}>
                          {section.fields.map((field) => (
                            <div key={field.key} className="flex items-center justify-between pt-2">
                              <label className="text-[11px] flex items-center gap-1.5" style={{ color: theme.textDim }}>
                                {field.dot && (
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-full"
                                    style={{ background: theme[field.key] }}
                                  />
                                )}
                                {field.label}
                              </label>
                              <div
                                className="relative w-6 h-6 rounded-md overflow-hidden cursor-pointer"
                                style={{ border: `1px solid ${theme.border}` }}
                              >
                                <input
                                  type="color"
                                  value={theme[field.key]}
                                  onChange={(e) => handleColorChange(field.key, e.target.value)}
                                  className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                                />
                                <div className="w-full h-full" style={{ background: theme[field.key] }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reset */}
              <div className="px-3 pb-3">
                <button
                  onClick={() => handlePreset("default")}
                  className="w-full py-1.5 rounded-md text-[10px] font-semibold cursor-pointer transition-colors"
                  style={{
                    background: "transparent",
                    border: `1px solid ${theme.border}`,
                    color: theme.textDim,
                  }}
                >
                  Reset to Default
                </button>
              </div>
            </div>
          )}

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
