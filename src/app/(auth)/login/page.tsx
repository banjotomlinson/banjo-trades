"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const ERROR_COPY: Record<string, string> = {
  auth_failed: "Sign-in didn't go through. Try again, and if it keeps happening let us know.",
  not_on_waitlist: "We couldn't find your email on the waitlist. Apply at /landing first — once you're approved, sign-in will work.",
  past_cap: "The closed beta is full. You're on the waitlist — we'll email you the moment a spot opens up.",
  config: "Server isn't quite set up. Hold tight.",
  unknown: "Something went sideways. Try again in a moment.",
  not_approved: "Your spot isn't approved yet. Hang tight — we'll email you when it is.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const params = useSearchParams();
  const router = useRouter();
  const urlError = params.get("error");
  const urlMessage = urlError ? (ERROR_COPY[urlError] ?? ERROR_COPY.unknown) : null;
  const position = params.get("position");

  const [tab, setTab] = useState<"email" | "google">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayError = error ?? urlMessage;

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      setError("Incorrect email or password.");
      setLoading(false);
      return;
    }
    router.push("/");
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/callback` },
    });
    if (oauthErr) {
      setError(oauthErr.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Trader<span className="text-[#3b82f6]">M8</span>
          </h1>
          <p className="text-[#64748b] text-sm mt-2">Your mate of the market</p>
        </div>

        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-8">
          <h2 className="text-lg font-semibold text-white mb-6 text-center">Sign in to continue</h2>

          {displayError && (
            <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {displayError}
              {position && urlError === "past_cap" && (
                <div className="text-[#94a3b8] text-xs mt-1.5">Your waitlist position: #{position}</div>
              )}
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex rounded-lg bg-[#0a0e17] border border-white/10 p-1 mb-6">
            <button
              type="button"
              onClick={() => setTab("email")}
              className={`flex-1 text-sm font-semibold py-2 rounded-md transition-colors ${
                tab === "email" ? "bg-[#1e293b] text-white" : "text-[#64748b] hover:text-white"
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setTab("google")}
              className={`flex-1 text-sm font-semibold py-2 rounded-md transition-colors ${
                tab === "google" ? "bg-[#1e293b] text-white" : "text-[#64748b] hover:text-white"
              }`}
            >
              Google
            </button>
          </div>

          {tab === "email" ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
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
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#94a3b8] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
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
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-lg transition-colors"
              >
                {loading ? "Signing in..." : "Sign in →"}
              </button>
            </form>
          ) : (
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {loading ? "Redirecting..." : "Continue with Google"}
            </button>
          )}

          <div className="mt-6 text-center">
            <p className="text-[#475569] text-xs">
              By signing in, you agree to our terms of service
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
