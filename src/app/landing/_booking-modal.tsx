"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const COACHING_TZ = "Europe/London";
const DAY_START_HOUR = 9;
const DAY_END_HOUR = 19;
const SLOT_MINUTES = 30;

function tzParts(date: Date, tz: string) {
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
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute") };
}

function buildSlot(y: number, m: number, d: number, hour: number, minute: number): Date {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const ymd = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const probe = new Date(`${ymd}T${hh}:${mm}:00Z`);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: COACHING_TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(probe);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  const offset = Math.round((asUTC - probe.getTime()) / 60000);
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const oh = String(Math.floor(abs / 60)).padStart(2, "0");
  const om = String(abs % 60).padStart(2, "0");
  return new Date(`${ymd}T${hh}:${mm}:00${sign}${oh}:${om}`);
}

function todayInLondon() {
  const p = tzParts(new Date(), COACHING_TZ);
  return { y: p.y, m: p.m, d: p.d };
}

function fmtTime(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(d);
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

function firstDayOfWeek(y: number, m: number) {
  const d = new Date(y, m - 1, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function isSameDay(a: { y: number; m: number; d: number }, b: { y: number; m: number; d: number }) {
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

function isPast(day: { y: number; m: number; d: number }, today: { y: number; m: number; d: number }) {
  if (day.y < today.y) return true;
  if (day.y === today.y && day.m < today.m) return true;
  if (day.y === today.y && day.m === today.m && day.d < today.d) return true;
  return false;
}

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = "calendar" | "time" | "details";

export default function BookingModal({ open, onClose }: BookingModalProps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const today = useMemo(() => todayInLondon(), []);
  const [viewMonth, setViewMonth] = useState({ y: today.y, m: today.m });
  const [selectedDay, setSelectedDay] = useState<{ y: number; m: number; d: number } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Date | null>(null);

  const [step, setStep] = useState<Step>("calendar");
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const userTz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    []
  );

  const selectedDayKey = selectedDay ? `${selectedDay.y}-${selectedDay.m}-${selectedDay.d}` : "";

  useEffect(() => {
    if (open) {
      setError(null);
      closeRef.current?.focus();
    } else {
      setSelectedDay(null);
      setSelectedSlot(null);
      setSubmitting(false);
      setConfirmed(null);
      setStep("calendar");
      setName("");
      setEmail("");
      setBookedSlots(new Set());
    }
  }, [open]);

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

  useEffect(() => {
    if (!selectedDayKey || !selectedDay) return;
    setLoadingSlots(true);
    const dateStr = `${selectedDay.y}-${String(selectedDay.m).padStart(2, "0")}-${String(selectedDay.d).padStart(2, "0")}`;
    fetch(`/api/coaching/slots?date=${dateStr}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.booked && Array.isArray(data.booked)) {
          setBookedSlots(new Set(data.booked as string[]));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSlots(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDayKey]);

  if (!open) return null;

  const totalDays = daysInMonth(viewMonth.y, viewMonth.m);
  const startOffset = firstDayOfWeek(viewMonth.y, viewMonth.m);

  function prevMonth() {
    setViewMonth((v) => {
      if (v.m === 1) return { y: v.y - 1, m: 12 };
      return { y: v.y, m: v.m - 1 };
    });
  }

  function nextMonth() {
    setViewMonth((v) => {
      if (v.m === 12) return { y: v.y + 1, m: 1 };
      return { y: v.y, m: v.m + 1 };
    });
  }

  const canGoPrev = viewMonth.y > today.y || (viewMonth.y === today.y && viewMonth.m > today.m);

  function selectDay(d: number) {
    const day = { y: viewMonth.y, m: viewMonth.m, d };
    if (isPast(day, today)) return;
    setSelectedDay(day);
    setSelectedSlot(null);
    setStep("time");
  }

  const timeSlots: Date[] = useMemo(() => {
    if (!selectedDay) return [];
    const slots: Date[] = [];
    for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
      for (let m = 0; m < 60; m += SLOT_MINUTES) {
        const s = buildSlot(selectedDay.y, selectedDay.m, selectedDay.d, h, m);
        if (s.getTime() > Date.now()) slots.push(s);
      }
    }
    return slots;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDayKey]);

  function pickSlot(s: Date) {
    if (bookedSlots.has(s.toISOString())) return;
    setSelectedSlot(s);
    setStep("details");
  }

  async function submit() {
    if (!selectedSlot) return;
    if (!name.trim()) { setError("Enter your name"); return; }
    if (!email.trim()) { setError("Enter your email"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/coaching/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          starts_at: selectedSlot.toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.error?.includes("already booked")) {
          setBookedSlots((prev) => new Set([...prev, selectedSlot.toISOString()]));
        }
        setError(data?.error ?? "Could not book that slot. Try another?");
        setSubmitting(false);
        return;
      }
      setConfirmed(selectedSlot);
    } catch {
      setError("Network error. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedDayLabel = selectedDay
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: COACHING_TZ,
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date(Date.UTC(selectedDay.y, selectedDay.m - 1, selectedDay.d, 12)))
    : "";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center px-0 sm:px-4 py-0 sm:py-6 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full sm:max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#05070d] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10 bg-[#05070d]">
          <div className="flex items-center gap-3">
            {step !== "calendar" && !confirmed && (
              <button
                type="button"
                onClick={() => {
                  if (step === "details") setStep("time");
                  else setStep("calendar");
                }}
                className="shrink-0 w-8 h-8 rounded-lg border border-white/10 hover:border-white/30 text-[#94a3b8] hover:text-white flex items-center justify-center transition-colors"
                aria-label="Back"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {confirmed
                  ? "You're booked in"
                  : step === "calendar"
                  ? "Pick a day"
                  : step === "time"
                  ? "Pick a time"
                  : "Create your account"}
              </h2>
              {!confirmed && step === "time" && selectedDay && (
                <p className="text-[11px] text-[#64748b] mt-0.5">{selectedDayLabel}</p>
              )}
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-8 h-8 rounded-lg border border-white/10 hover:border-white/30 text-[#94a3b8] hover:text-white flex items-center justify-center transition-colors"
          >
            &times;
          </button>
        </div>

        {confirmed ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 mb-5">
              <span className="text-2xl text-[#22c55e]">&#10003;</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
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
              .
            </p>
            <p className="text-sm text-[#94a3b8] mb-6 leading-relaxed">
              Banjo will send the meeting link to{" "}
              <strong className="text-white">{email}</strong> before your session.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        ) : step === "calendar" ? (
          <div className="px-5 py-5">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={prevMonth}
                disabled={!canGoPrev}
                className="w-8 h-8 rounded-lg border border-white/10 hover:border-white/30 disabled:opacity-20 disabled:cursor-not-allowed text-[#94a3b8] hover:text-white flex items-center justify-center transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span className="text-sm font-semibold text-white">
                {MONTH_NAMES[viewMonth.m - 1]} {viewMonth.y}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="w-8 h-8 rounded-lg border border-white/10 hover:border-white/30 text-[#94a3b8] hover:text-white flex items-center justify-center transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_NAMES.map((dn) => (
                <div key={dn} className="text-center text-[10px] uppercase tracking-wider font-bold text-[#475569] py-1">
                  {dn}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: totalDays }).map((_, i) => {
                const d = i + 1;
                const day = { y: viewMonth.y, m: viewMonth.m, d };
                const past = isPast(day, today);
                const isToday = isSameDay(day, today);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={past}
                    onClick={() => selectDay(d)}
                    className={`aspect-square rounded-lg text-sm font-medium transition-all flex items-center justify-center ${
                      past
                        ? "text-[#2a2e3a] cursor-not-allowed"
                        : isSelected
                        ? "bg-[#3b82f6] text-white shadow-lg shadow-[#3b82f6]/30"
                        : isToday
                        ? "bg-white/[0.08] text-white ring-1 ring-[#3b82f6]/40 hover:bg-[#3b82f6]/20"
                        : "text-[#e2e8f0] hover:bg-white/[0.06]"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-[11px] text-[#475569] text-center">
              Weekdays and weekends. Sessions run 9:00-19:00 London time.
            </p>
          </div>
        ) : step === "time" ? (
          <div className="px-5 py-5">
            {loadingSlots ? (
              <div className="py-12 text-center text-sm text-[#64748b]">Loading available times...</div>
            ) : timeSlots.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-[#94a3b8] mb-3">No available slots left today.</p>
                <button
                  type="button"
                  onClick={() => setStep("calendar")}
                  className="text-sm text-[#3b82f6] hover:text-[#60a5fa] font-semibold transition-colors"
                >
                  Pick another day
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((s) => {
                    const iso = s.toISOString();
                    const booked = bookedSlots.has(iso);
                    const isSelected = selectedSlot?.toISOString() === iso;
                    return (
                      <button
                        key={iso}
                        type="button"
                        disabled={booked}
                        onClick={() => pickSlot(s)}
                        className={`rounded-lg py-3 text-sm font-medium transition-all ${
                          booked
                            ? "bg-white/[0.02] text-[#2a2e3a] cursor-not-allowed line-through"
                            : isSelected
                            ? "bg-[#3b82f6] text-white shadow-lg shadow-[#3b82f6]/30"
                            : "bg-white/[0.03] text-[#e2e8f0] hover:bg-[#3b82f6]/15 hover:text-white border border-white/5 hover:border-[#3b82f6]/30"
                        }`}
                      >
                        {fmtTime(s, userTz)}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-4 text-[11px] text-[#475569] text-center">
                  Times shown in {userTz}. Greyed out slots are already booked.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="px-5 py-5">
            <div className="rounded-lg bg-white/[0.03] border border-white/5 px-4 py-3 mb-5">
              <div className="text-[10px] uppercase tracking-wider font-bold text-[#3b82f6] mb-1">Your session</div>
              <div className="text-sm font-semibold text-white">
                {selectedSlot && new Intl.DateTimeFormat("en-GB", {
                  timeZone: userTz,
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(selectedSlot)}
              </div>
            </div>

            <p className="text-sm text-[#94a3b8] mb-5 leading-relaxed">
              Enter your name and email to create your TraderM8 account and confirm the booking.
            </p>

            <div className="space-y-3">
              <label className="block">
                <div className="text-[11px] uppercase tracking-wider font-bold text-[#94a3b8] mb-2">
                  Your name
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={200}
                  placeholder="First and last name"
                  autoComplete="name"
                  className="w-full bg-[#0a0e17] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30 transition-colors"
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
                  autoComplete="email"
                  className="w-full bg-[#0a0e17] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30 transition-colors"
                />
              </label>
            </div>

            {error && (
              <div className="mt-3 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 px-4 py-3 text-sm text-[#ef4444]">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white text-sm font-semibold px-6 py-3.5 rounded-lg shadow-lg shadow-[#3b82f6]/25 transition-all hover:shadow-[#3b82f6]/40"
            >
              {submitting ? "Creating account & booking..." : "Create account & book session"}
            </button>

            <p className="mt-3 text-center text-[11px] text-[#475569]">
              Your first 30-minute session is free. No card required.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
