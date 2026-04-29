"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const LOCATIONS = [
  { val: "America/New_York", label: "New York", region: "Americas" },
  { val: "America/Chicago", label: "Chicago", region: "Americas" },
  { val: "America/Denver", label: "Denver", region: "Americas" },
  { val: "America/Los_Angeles", label: "Los Angeles", region: "Americas" },
  { val: "America/Sao_Paulo", label: "São Paulo", region: "Americas" },
  { val: "America/Toronto", label: "Toronto", region: "Americas" },
  { val: "Europe/London", label: "London", region: "Europe" },
  { val: "Europe/Paris", label: "Paris / Berlin", region: "Europe" },
  { val: "Europe/Amsterdam", label: "Amsterdam", region: "Europe" },
  { val: "Europe/Madrid", label: "Madrid", region: "Europe" },
  { val: "Europe/Moscow", label: "Moscow", region: "Europe" },
  { val: "Africa/Johannesburg", label: "Johannesburg", region: "Africa" },
  { val: "Africa/Lagos", label: "Lagos", region: "Africa" },
  { val: "Asia/Dubai", label: "Dubai", region: "Middle East & Asia" },
  { val: "Asia/Kolkata", label: "Mumbai / Delhi", region: "Middle East & Asia" },
  { val: "Asia/Singapore", label: "Singapore", region: "Middle East & Asia" },
  { val: "Asia/Shanghai", label: "Shanghai / Beijing", region: "Middle East & Asia" },
  { val: "Asia/Tokyo", label: "Tokyo", region: "Middle East & Asia" },
  { val: "Asia/Seoul", label: "Seoul", region: "Middle East & Asia" },
  { val: "Asia/Hong_Kong", label: "Hong Kong", region: "Middle East & Asia" },
  { val: "Australia/Sydney", label: "Sydney", region: "Oceania" },
  { val: "Australia/Perth", label: "Perth", region: "Oceania" },
  { val: "Australia/Brisbane", label: "Brisbane", region: "Oceania" },
  { val: "Pacific/Auckland", label: "Auckland", region: "Oceania" },
];

const REGIONS = Array.from(new Set(LOCATIONS.map((l) => l.region)));

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [tokenEmail, setTokenEmail] = useState<string | null>(null);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [location, setLocation] = useState("");
  const [locationOpen, setLocationOpen] = useState(false);

  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) { setTokenInvalid(true); return; }
    // Decode the base64url payload to extract email client-side (for pre-fill only).
    // Full verification happens server-side on submit.
    try {
      const decoded = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
      const parts = decoded.split("|");
      if (parts.length === 3) {
        setTokenEmail(parts[0]);
        setEmail(parts[0]);
      } else {
        setTokenInvalid(true);
      }
    } catch {
      setTokenInvalid(true);
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!location) { setErrorMsg("Please select your location"); return; }
    setStatus("submitting");
    setErrorMsg("");

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, firstName, lastName, email, password, timezone: location }),
    });

    const data = await res.json();
    if (!res.ok) {
      setStatus("error");
      setErrorMsg(data.error ?? "Something went wrong");
      return;
    }

    // Auto sign-in
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      setStatus("done");
      return;
    }

    // Sync timezone to localStorage so dashboard picks it up immediately
    if (location && location !== "auto") {
      try { localStorage.setItem("banjoTZ", location); } catch { /* ignore */ }
    }

    router.push("/");
  }

  const selectedLocation = LOCATIONS.find((l) => l.val === location);

  if (tokenInvalid) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="text-3xl font-bold text-white mb-2">Trader<span className="text-[#3b82f6]">M8</span></div>
          <div className="mt-10 bg-[#111827] border border-[#1e293b] rounded-xl p-8">
            <div className="text-4xl mb-4">🔗</div>
            <h2 className="text-lg font-semibold text-white mb-3">Invalid or expired link</h2>
            <p className="text-sm text-[#94a3b8] leading-relaxed">
              This invite link is no longer valid. Links expire after 7 days. Please contact us and we&apos;ll send a new one.
            </p>
            <a href="mailto:banjotomlinson@gmail.com" className="mt-6 inline-block text-sm text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
              Contact us →
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="text-3xl font-bold text-white mb-2">Trader<span className="text-[#3b82f6]">M8</span></div>
          <div className="mt-10 bg-[#111827] border border-[#22c55e]/30 rounded-xl p-8">
            <div className="text-4xl mb-4">✓</div>
            <h2 className="text-lg font-semibold text-white mb-3">Account created!</h2>
            <p className="text-sm text-[#94a3b8] mb-6">Head to the login page to sign in with your new account.</p>
            <a href="/login" className="inline-flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors">
              Go to login →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-white tracking-tight">
            Trader<span className="text-[#3b82f6]">M8</span>
          </div>
          <p className="text-[#64748b] text-sm mt-1">Your mate of the market</p>
        </div>

        {/* Welcome card */}
        <div className="mb-6 rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/[0.06] p-5 text-center">
          <div className="text-2xl mb-2">🎉</div>
          <h1 className="text-lg font-bold text-white mb-1">Thank you for choosing TraderM8</h1>
          <p className="text-sm text-[#94a3b8] leading-relaxed">
            You&apos;ve been approved for early access. Create your account below — it&apos;s free for life, no card required.
          </p>
        </div>

        {/* Form */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 sm:p-8">
          <h2 className="text-base font-semibold text-white mb-6">Create your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#94a3b8] mb-1.5">
                  First name
                </label>
                <input
                  type="text"
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Banjo"
                  className="w-full bg-[#0a0e17] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#94a3b8] mb-1.5">
                  Last name
                </label>
                <input
                  type="text"
                  required
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Tomlinson"
                  className="w-full bg-[#0a0e17] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30 transition-colors"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-bold text-[#94a3b8] mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#0a0e17] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30 transition-colors"
              />
              {tokenEmail && email.toLowerCase() !== tokenEmail && (
                <p className="mt-1 text-[11px] text-amber-400">
                  Use the email this invite was sent to: {tokenEmail}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-bold text-[#94a3b8] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full bg-[#0a0e17] border border-white/10 rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-bold text-[#94a3b8] mb-1.5">
                Where are you based?
              </label>
              <p className="text-[11px] text-[#475569] mb-2">Sets your dashboard timezone — you can change it in settings later.</p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLocationOpen(!locationOpen)}
                  className={`w-full flex items-center justify-between bg-[#0a0e17] border rounded-lg px-3 py-2.5 text-sm text-left transition-colors ${
                    locationOpen
                      ? "border-[#3b82f6] ring-1 ring-[#3b82f6]/30"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <span className={selectedLocation ? "text-white" : "text-[#475569]"}>
                    {selectedLocation ? selectedLocation.label : "Select your city or region"}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`text-[#64748b] transition-transform shrink-0 ${locationOpen ? "rotate-180" : ""}`}>
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {locationOpen && (
                  <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-white/10 bg-[#0a0e17] shadow-2xl shadow-black/60 overflow-hidden max-h-64 overflow-y-auto">
                    {REGIONS.map((region) => (
                      <div key={region}>
                        <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] font-bold text-[#475569] bg-[#05070d] sticky top-0">
                          {region}
                        </div>
                        {LOCATIONS.filter((l) => l.region === region).map((loc) => (
                          <button
                            key={loc.val}
                            type="button"
                            onClick={() => { setLocation(loc.val); setLocationOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                              loc.val === location
                                ? "bg-[#3b82f6]/15 text-[#60a5fa]"
                                : "text-[#e2e8f0] hover:bg-white/[0.05]"
                            }`}
                          >
                            {loc.label}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {(status === "error" || errorMsg) && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white text-sm font-semibold px-6 py-3 rounded-lg shadow-lg shadow-[#3b82f6]/25 transition-all mt-2"
            >
              {status === "submitting" ? "Creating account..." : "Create account →"}
            </button>

            <p className="text-center text-[11px] text-[#475569]">
              Already have an account?{" "}
              <a href="/login" className="text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
                Sign in
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
