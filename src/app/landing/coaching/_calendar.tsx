"use client";

// Booking calendar for 1-on-1 coaching sessions.
//
// Same component runs on the public marketing page and inside the dashboard.
// `mode="public"` redirects unauthenticated visitors to /login; `mode="app"`
// expects a signed-in user and surfaces the free-session indicator.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const COACHING_TZ = "Europe/London";
const DAY_START_HOUR = 9;
const DAY_END_HOUR = 19; // exclusive — last slot is 18:30
const SLOT_MINUTES = 30;
const DAYS_AHEAD = 14;
const PAID_PRICE_LABEL = "£49"; // surfaced from server in real impl, hard-coded for placeholder

// ── Helpers ───────────────────────────────────────────────────────
function startOfDayInTz(d: Date): Date {
  // Returns a Date whose UTC instant corresponds to 00:00 in COACHING_TZ.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: COACHING_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const mo = Number(parts.find((p) => p.type === "month")?.value);
  const da = Number(parts.find((p) => p.type === "day")?.value);
  // Use noon UTC as a stable anchor, then walk back to the equivalent of 00:00 in the TZ.
  // Easiest reliable approach: build the ISO via the formatted parts.
  return new Date(`${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}T00:00:00`);
}

function buildSlot(day: Date, hour: number, minute: number): Date {
  // `day` is a date-at-midnight in COACHING_TZ (per startOfDayInTz). We
  // construct the ISO string with the offset for that TZ on that date.
  const y = day.getFullYear();
  const m = String(day.getMonth() + 1).padStart(2, "0");
  const d = String(day.getDate()).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  // Get the TZ offset for the COACHING_TZ on that calendar date.
  const probe = new Date(`${y}-${m}-${d}T${hh}:${mm}:00Z`);
  const offsetMinutes = tzOffsetMinutes(probe, COACHING_TZ);
  const offsetSign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const oh = String(Math.floor(abs / 60)).padStart(2, "0");
  const om = String(abs % 60).padStart(2, "0");
  return new Date(`${y}-${m}-${d}T${hh}:${mm}:00${offsetSign}${oh}:${om}`);
}

function tzOffsetMinutes(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return Math.round((asUTC - date.getTime()) / 60000);
}

function fmtSlotInTz(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function fmtDayLabel(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: COACHING_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

function isoDay(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: COACHING_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// ── Component ─────────────────────────────────────────────────────
type Mode = "public" | "app";

interface Props {
  mode: Mode;
  signedIn?: boolean;
  hasFreeLeft?: boolean;
}

interface Slot {
  start: Date;
  busy: boolean;
}

export default function CoachingCalendar({ mode, signedIn = false, hasFreeLeft = true }: Props) {
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Date | null>(null);
  const [topic, setTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const userTz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );

  // Build the next N days × slots-per-day grid.
  const days = useMemo(() => {
    const today = startOfDayInTz(new Date());
    const list: { day: Date; slots: Slot[] }[] = [];
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      const slots: Slot[] = [];
      for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
        for (let m = 0; m < 60; m += SLOT_MINUTES) {
          const start = buildSlot(day, h, m);
          // Skip slots already in the past.
          if (start.getTime() < Date.now()) continue;
          slots.push({ start, busy: false });
        }
      }
      list.push({ day, slots });
    }
    return list;
  }, []);

  // Mark busy from the API (best-effort — failure leaves them all available).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const from = days[0].day.toISOString();
        const to = new Date(
          days[days.length - 1].day.getTime() + 24 * 3600 * 1000,
        ).toISOString();
        const res = await fetch(
          `/api/coaching/slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { busy: string[] };
        if (cancelled) return;
        setBusy(new Set(data.busy));
      } catch {
        // silent — leave all slots clickable
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  async function confirm() {
    if (!selected) return;
    if (mode === "public" && !signedIn) {
      window.location.href = `/login?next=${encodeURIComponent("/coaching")}`;
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    setOkMsg(null);
    try {
      const useFree = hasFreeLeft;
      const endpoint = useFree ? "/api/coaching/book" : "/api/coaching/checkout";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          starts_at: selected.toISOString(),
          topic: topic.slice(0, 500),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error ?? "Could not book that slot — try another?");
        setSubmitting(false);
        return;
      }
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      setOkMsg(
        useFree
          ? "Booked. Check your email for the calendar invite."
          : "Booking saved.",
      );
      setBusy((prev) => new Set(prev).add(selected.toISOString()));
      setSelected(null);
      setTopic("");
    } catch {
      setErrorMsg("Network error — try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  const ctaLabel = (() => {
    if (mode === "public" && !signedIn) return "Sign in to confirm →";
    if (hasFreeLeft) return "Confirm free 30-min session";
    return `Continue to checkout · ${PAID_PRICE_LABEL}`;
  })();

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 sm:p-7">
      <div className="flex items-baseline justify-between gap-4 flex-wrap mb-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[#3b82f6]">
            Pick a time
          </div>
          <div className="text-sm text-[#94a3b8] mt-1">
            All times shown in <span className="text-white">{userTz}</span> ·
            sessions run 9:00am–7:00pm London time
          </div>
        </div>
        {mode === "app" && (
          <div
            className={`text-xs font-semibold rounded-full px-3 py-1 border ${
              hasFreeLeft
                ? "border-[#22c55e]/30 bg-[#22c55e]/10 text-[#22c55e]"
                : "border-white/10 bg-white/[0.03] text-[#94a3b8]"
            }`}
          >
            {hasFreeLeft
              ? "Free 30-min available"
              : `Free session used · paid ${PAID_PRICE_LABEL}`}
          </div>
        )}
      </div>

      <div className="overflow-x-auto -mx-2 px-2">
        <div className="flex gap-3 min-w-max pb-2">
          {days.map(({ day, slots }) => {
            const visible = slots.filter((s) => !busy.has(s.start.toISOString()) || true);
            return (
              <div
                key={isoDay(day)}
                className="w-[164px] shrink-0 rounded-xl border border-white/10 bg-[#05070d] p-3"
              >
                <div className="text-center mb-3">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-[#3b82f6]">
                    {fmtDayLabel(day).split(" ")[0]}
                  </div>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    {fmtDayLabel(day).split(" ").slice(1).join(" ")}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {visible.length === 0 && (
                    <div className="col-span-2 text-center text-[11px] text-[#475569] py-4">
                      —
                    </div>
                  )}
                  {visible.map((s) => {
                    const iso = s.start.toISOString();
                    const taken = busy.has(iso);
                    const isSelected = selected?.toISOString() === iso;
                    return (
                      <button
                        key={iso}
                        type="button"
                        disabled={taken}
                        onClick={() => setSelected(s.start)}
                        className={`text-[11px] rounded-md py-1.5 transition-colors font-medium ${
                          taken
                            ? "bg-white/[0.02] text-[#334155] line-through cursor-not-allowed"
                            : isSelected
                              ? "bg-[#3b82f6] text-white"
                              : "bg-white/[0.03] text-[#e2e8f0] hover:bg-[#3b82f6]/20 hover:text-white"
                        }`}
                      >
                        {fmtSlotInTz(s.start, userTz)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selection / confirm panel */}
      <div className="mt-6 border-t border-white/10 pt-6">
        {!selected && !okMsg && (
          <p className="text-sm text-[#64748b]">
            Pick a slot above to continue.
          </p>
        )}

        {okMsg && (
          <div className="rounded-lg border border-[#22c55e]/30 bg-[#22c55e]/[0.06] px-4 py-3 text-sm text-[#22c55e]">
            ✓ {okMsg}
          </div>
        )}

        {selected && !okMsg && (
          <div className="space-y-4">
            <div className="text-sm text-[#e2e8f0]">
              <span className="text-[#94a3b8]">Selected:</span>{" "}
              <span className="font-semibold text-white">
                {new Intl.DateTimeFormat("en-GB", {
                  timeZone: userTz,
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(selected)}
              </span>
              <span className="text-[#475569]">
                {" "}
                ({fmtSlotInTz(selected, COACHING_TZ)} London)
              </span>
            </div>

            <label className="block">
              <div className="text-[11px] uppercase tracking-wider font-bold text-[#94a3b8] mb-2">
                What do you want to cover?{" "}
                <span className="text-[#475569] normal-case">(optional)</span>
              </div>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="e.g. liquidity reads on NQ, journaling habits, sizing rules..."
                className="w-full bg-[#0a0e17] border border-white/10 rounded-md px-4 py-3 text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-[#3b82f6] resize-y transition-colors"
              />
            </label>

            {errorMsg && (
              <div className="text-sm text-[#ef4444]">{errorMsg}</div>
            )}

            {mode === "public" && !signedIn ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/login?next=${encodeURIComponent("/coaching")}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-semibold px-6 py-3 rounded-md transition-colors"
                >
                  Sign in to confirm
                  <span aria-hidden>→</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/30 text-white text-sm font-semibold px-6 py-3 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={confirm}
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white text-sm font-semibold px-6 py-3 rounded-md shadow-lg shadow-[#3b82f6]/25 transition-all"
                >
                  {submitting ? "Working..." : ctaLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/30 disabled:opacity-50 text-white text-sm font-semibold px-6 py-3 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
