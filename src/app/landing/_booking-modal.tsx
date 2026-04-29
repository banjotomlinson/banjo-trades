"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const COACHING_TZ = "Europe/London";
const DAY_START_HOUR = 9;
const DAY_END_HOUR = 19; // exclusive — last slot is 18:30
const SLOT_MINUTES = 30;
const DAYS_AHEAD = 14;

// ── Time helpers ──────────────────────────────────────────────────
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
    get("second")
  );
  return Math.round((asUTC - date.getTime()) / 60000);
}

function buildSlot(londonYmd: { y: number; m: number; d: number }, hour: number, minute: number): Date {
  const { y, m, d } = londonYmd;
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const ymd = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const probe = new Date(`${ymd}T${hh}:${mm}:00Z`);
  const offset = tzOffsetMinutes(probe, COACHING_TZ);
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const oh = String(Math.floor(abs / 60)).padStart(2, "0");
  const om = String(abs % 60).padStart(2, "0");
  return new Date(`${ymd}T${hh}:${mm}:00${sign}${oh}:${om}`);
}

function todayInLondon(): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: COACHING_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

function addDays(londonYmd: { y: number; m: number; d: number }, n: number) {
  // Anchor at noon UTC on the date so DST never bumps the day.
  const anchor = new Date(
    Date.UTC(londonYmd.y, londonYmd.m - 1, londonYmd.d, 12, 0, 0)
  );
  anchor.setUTCDate(anchor.getUTCDate() + n);
  return {
    y: anchor.getUTCFullYear(),
    m: anchor.getUTCMonth() + 1,
    d: anchor.getUTCDate(),
  };
}

function fmtDayLabel(londonYmd: { y: number; m: number; d: number }): string {
  // Render the date label in London tz so it lines up with the slots.
  const probe = new Date(
    Date.UTC(londonYmd.y, londonYmd.m - 1, londonYmd.d, 12, 0, 0)
  );
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: COACHING_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(probe);
}

function fmtSlotInTz(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// ── Modal ─────────────────────────────────────────────────────────
interface BookingModalProps {
  open: boolean;
  onClose: () => void;
}

export default function BookingModal({ open, onClose }: BookingModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [selected, setSelected] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Date | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const userTz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    []
  );

  // Build 14-day × slot grid in London time.
  const days = useMemo(() => {
    const today = todayInLondon();
    const list: { ymd: { y: number; m: number; d: number }; slots: Date[] }[] = [];
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const ymd = addDays(today, i);
      const slots: Date[] = [];
      for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
        for (let m = 0; m < 60; m += SLOT_MINUTES) {
          const start = buildSlot(ymd, h, m);
          if (start.getTime() < Date.now()) continue;
          slots.push(start);
        }
      }
      list.push({ ymd, slots });
    }
    return list;
  }, []);

  // Reset state when the modal closes so reopening starts fresh.
  useEffect(() => {
    if (open) {
      setError(null);
      // Focus the close button so Esc / tab order is sane.
      closeButtonRef.current?.focus();
    } else {
      setSelected(null);
      setSubmitting(false);
      setConfirmed(null);
    }
  }, [open]);

  // Esc-to-close + body scroll lock while the modal is up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  async function submit() {
    if (!selected) {
      setError("Pick a slot first");
      return;
    }
    if (!name.trim()) {
      setError("Tell us your name");
      return;
    }
    if (!email.trim()) {
      setError("Enter your email");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/coaching/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          starts_at: selected.toISOString(),
          topic: topic.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Could not book that slot — try another?");
        setSubmitting(false);
        return;
      }
      setConfirmed(selected);
    } catch {
      setError("Network error — try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-6 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-title"
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#05070d] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-6 py-5 border-b border-white/10 bg-[#05070d]">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#3b82f6] mb-1">
              30-minute call with Banjo
            </div>
            <h2
              id="booking-title"
              className="text-xl sm:text-2xl font-bold text-white tracking-tight"
            >
              Pick a time that works for you
            </h2>
            <p className="text-xs text-[#64748b] mt-1">
              All times shown in <span className="text-white">{userTz}</span> ·
              sessions run 9:00–19:00 London time
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-9 h-9 rounded-lg border border-white/10 hover:border-white/30 text-[#94a3b8] hover:text-white flex items-center justify-center text-lg leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {confirmed ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 mb-5">
              <span className="text-2xl text-[#22c55e]">✓</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              You&rsquo;re booked in.
            </h3>
            <p className="text-sm text-[#94a3b8] mb-2 leading-relaxed">
              Your call is confirmed for{" "}
              <strong className="text-white">
                {new Intl.DateTimeFormat("en-GB", {
                  timeZone: userTz,
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(confirmed)}
              </strong>
              <span className="text-[#475569]">
                {" "}
                ({fmtSlotInTz(confirmed, COACHING_TZ)} London)
              </span>
              .
            </p>
            <p className="text-sm text-[#94a3b8] mb-6 leading-relaxed">
              Banjo will send the meeting link to{" "}
              <strong className="text-white">{email}</strong> before the slot.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Slot picker */}
            <div className="px-6 py-5">
              <div className="overflow-x-auto -mx-2 px-2">
                <div className="flex gap-3 min-w-max pb-2">
                  {days.map(({ ymd, slots }) => (
                    <div
                      key={`${ymd.y}-${ymd.m}-${ymd.d}`}
                      className="w-[160px] shrink-0 rounded-xl border border-white/10 bg-[#0a0e17] p-3"
                    >
                      <div className="text-center mb-3">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-[#3b82f6]">
                          {fmtDayLabel(ymd).split(" ")[0]}
                        </div>
                        <div className="text-sm font-semibold text-white mt-0.5">
                          {fmtDayLabel(ymd).split(" ").slice(1).join(" ")}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {slots.length === 0 && (
                          <div className="col-span-2 text-center text-[11px] text-[#475569] py-4">
                            —
                          </div>
                        )}
                        {slots.map((s) => {
                          const iso = s.toISOString();
                          const isSelected =
                            selected?.toISOString() === iso;
                          return (
                            <button
                              key={iso}
                              type="button"
                              onClick={() => setSelected(s)}
                              className={`text-[11px] rounded-md py-1.5 transition-colors font-medium ${
                                isSelected
                                  ? "bg-[#3b82f6] text-white"
                                  : "bg-white/[0.03] text-[#e2e8f0] hover:bg-[#3b82f6]/20 hover:text-white"
                              }`}
                            >
                              {fmtSlotInTz(s, userTz)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="px-6 py-5 border-t border-white/10 bg-[#0a0e17]">
              {selected ? (
                <div className="mb-4 text-sm text-[#e2e8f0]">
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
              ) : (
                <p className="mb-4 text-sm text-[#64748b]">
                  Pick a slot above to continue.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-[11px] uppercase tracking-wider font-bold text-[#94a3b8] mb-2">
                    Your name
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={200}
                    placeholder="Jane Trader"
                    className="w-full bg-[#05070d] border border-white/10 rounded-md px-4 py-2.5 text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-[#3b82f6] transition-colors"
                  />
                </label>
                <label className="block">
                  <div className="text-[11px] uppercase tracking-wider font-bold text-[#94a3b8] mb-2">
                    Email
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-[#05070d] border border-white/10 rounded-md px-4 py-2.5 text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-[#3b82f6] transition-colors"
                  />
                </label>
              </div>

              <label className="block mt-3">
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
                  className="w-full bg-[#05070d] border border-white/10 rounded-md px-4 py-2.5 text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-[#3b82f6] resize-y transition-colors"
                />
              </label>

              {error && (
                <div className="mt-3 text-sm text-[#ef4444]">{error}</div>
              )}

              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting || !selected}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-3 rounded-lg shadow-lg shadow-[#3b82f6]/25 transition-all"
                >
                  {submitting
                    ? "Booking..."
                    : "Confirm 30-min call (free)"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/30 disabled:opacity-50 text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
