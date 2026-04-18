"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/providers/ThemeProvider";
import {
  type ThemeColors,
  type PresetName,
  type PresetMeta,
  PRESETS,
  themeColorsToDbRow,
  detectActivePreset,
} from "@/lib/theme";
import type { User } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Timezone options (same as MarketClocks)
// ---------------------------------------------------------------------------
const TZ_OPTIONS = [
  { val: "auto", label: "Auto-detect" },
  { val: "America/New_York", label: "New York (ET)" },
  { val: "America/Chicago", label: "Chicago (CT)" },
  { val: "America/Denver", label: "Denver (MT)" },
  { val: "America/Los_Angeles", label: "Los Angeles (PT)" },
  { val: "Europe/London", label: "London (GMT/BST)" },
  { val: "Europe/Paris", label: "Paris (CET)" },
  { val: "Europe/Moscow", label: "Moscow (MSK)" },
  { val: "Asia/Dubai", label: "Dubai (GST)" },
  { val: "Asia/Kolkata", label: "Mumbai (IST)" },
  { val: "Asia/Singapore", label: "Singapore (SGT)" },
  { val: "Asia/Shanghai", label: "Shanghai (CST)" },
  { val: "Asia/Tokyo", label: "Tokyo (JST)" },
  { val: "Australia/Perth", label: "Perth (AWST)" },
  { val: "Australia/Sydney", label: "Sydney (AEST)" },
  { val: "Australia/Brisbane", label: "Brisbane (AEST)" },
  { val: "Pacific/Auckland", label: "Auckland (NZST)" },
];

// ---------------------------------------------------------------------------
// Accordion section definitions
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("auto");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [profileSaveStatus, setProfileSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load user and profile
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        // Load profile
        supabase
          .from("profiles")
          .select("display_name, timezone")
          .eq("id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setDisplayName(profile.display_name || data.user?.user_metadata?.full_name || "");
              setTimezone(profile.timezone || "auto");
            } else {
              setDisplayName(data.user?.user_metadata?.full_name || "");
            }
          });
      }
    });
  }, []);

  // Save theme to Supabase with debounce
  const saveThemeToDb = useCallback(
    (colors: ThemeColors, presetName?: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSaveStatus("saving");
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
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } catch {
          setSaveStatus("idle");
        }
      }, 500);
    },
    []
  );

  // Save profile to Supabase with debounce
  const saveProfile = useCallback(
    (name: string, tz: string) => {
      if (!user) return;
      if (profileDebounceRef.current) clearTimeout(profileDebounceRef.current);
      setProfileSaveStatus("saving");
      profileDebounceRef.current = setTimeout(async () => {
        const supabase = createClient();
        await supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              display_name: name,
              timezone: tz,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
        setProfileSaveStatus("saved");
        setTimeout(() => setProfileSaveStatus("idle"), 2000);
      }, 500);
    },
    [user]
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

  const handleDisplayNameChange = useCallback(
    (value: string) => {
      setDisplayName(value);
      saveProfile(value, timezone);
    },
    [timezone, saveProfile]
  );

  const handleTimezoneChange = useCallback(
    (value: string) => {
      setTimezone(value);
      saveProfile(displayName, value);
    },
    [displayName, saveProfile]
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

  return (
    <div className="p-4 sm:p-6 max-w-[800px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: theme.text }}>
          Settings
        </h1>
        <div className="flex items-center gap-2 text-xs" style={{ color: theme.textDim }}>
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Saved
            </span>
          )}
          {profileSaveStatus === "saving" && saveStatus === "idle" && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Saving...
            </span>
          )}
          {profileSaveStatus === "saved" && saveStatus === "idle" && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Profile Section */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ background: theme.panelBg, border: `1px solid ${theme.border}` }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: theme.textDim }}>
          Profile
        </h2>

        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="shrink-0">
            {avatar ? (
              <img
                src={avatar}
                alt=""
                className="w-16 h-16 rounded-full border-2 object-cover"
                style={{ borderColor: theme.border }}
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                style={{ background: theme.accent, color: "#fff" }}
              >
                {(displayName || "?")[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* Fields */}
          <div className="flex-1 space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textDim }}>
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => handleDisplayNameChange(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  background: theme.bg,
                  border: `1px solid ${theme.border}`,
                  color: theme.text,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = theme.accent)}
                onBlur={(e) => (e.currentTarget.style.borderColor = theme.border)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textDim }}>
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => handleTimezoneChange(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none cursor-pointer transition-colors"
                style={{
                  background: theme.bg,
                  border: `1px solid ${theme.border}`,
                  color: theme.text,
                }}
              >
                {TZ_OPTIONS.map((o) => (
                  <option key={o.val} value={o.val}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Section */}
      <div
        className="rounded-xl p-5 space-y-5"
        style={{ background: theme.panelBg, border: `1px solid ${theme.border}` }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: theme.textDim }}>
          Theme
        </h2>

        {/* Quick Themes */}
        <div>
          <div className="text-xs font-medium mb-3" style={{ color: theme.textDim }}>
            Quick Themes
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {(Object.entries(PRESETS) as [PresetName, PresetMeta][]).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handlePreset(key)}
                className="flex flex-col items-center gap-1.5 bg-transparent border-none cursor-pointer p-0 group"
              >
                <div
                  className="w-12 h-12 rounded-xl transition-all"
                  style={{
                    background: preset.gradient,
                    border: activePreset === key ? "2px solid #fff" : `2px solid ${theme.border}`,
                    boxShadow: activePreset === key ? "0 0 0 1px rgba(255,255,255,0.3)" : "none",
                    transform: activePreset === key ? "scale(1.05)" : "scale(1)",
                  }}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: activePreset === key ? theme.text : theme.textDim }}
                >
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Accordion sections */}
        <div className="space-y-2">
          {SECTIONS.map((section) => {
            const sectionOpen = openSections.has(section.id);
            return (
              <div
                key={section.id}
                className="rounded-lg overflow-hidden"
                style={{ border: `1px solid ${theme.border}`, background: theme.bg }}
              >
                {/* Accordion header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-transparent border-none cursor-pointer"
                  style={{ color: theme.text }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">{section.icon}</span>
                    <span className="text-sm font-medium">{section.title}</span>
                  </div>
                  <span
                    className="text-[10px] transition-transform duration-200"
                    style={{
                      transform: sectionOpen ? "rotate(180deg)" : "rotate(0deg)",
                      color: theme.textDim,
                    }}
                  >
                    &#9660;
                  </span>
                </button>

                {/* Accordion body */}
                <div
                  className="transition-all duration-200 ease-in-out overflow-hidden"
                  style={{ maxHeight: sectionOpen ? 400 : 0, opacity: sectionOpen ? 1 : 0 }}
                >
                  <div className="px-4 pb-4 flex flex-col gap-3" style={{ borderTop: `1px solid ${theme.border}` }}>
                    {section.fields.map((field) => (
                      <div key={field.key} className="flex items-center justify-between pt-3">
                        <label className="text-xs flex items-center gap-2" style={{ color: theme.textDim }}>
                          {field.dot && (
                            <span
                              className="inline-block w-3 h-3 rounded-full"
                              style={{ background: theme[field.key] }}
                            />
                          )}
                          {field.label}
                        </label>
                        <div
                          className="relative w-8 h-8 rounded-lg overflow-hidden cursor-pointer"
                          style={{ border: `1px solid ${theme.border}` }}
                        >
                          <input
                            type="color"
                            value={theme[field.key]}
                            onChange={(e) => handleColorChange(field.key, e.target.value)}
                            className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                          />
                          <div
                            className="w-full h-full"
                            style={{ background: theme[field.key] }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reset button */}
        <button
          onClick={() => handlePreset("default")}
          className="w-full py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150"
          style={{
            background: theme.bg,
            border: `1px solid ${theme.border}`,
            color: theme.textDim,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = theme.accent)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = theme.border)}
        >
          Reset to Default
        </button>
      </div>
    </div>
  );
}
