"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { email },
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (data.session) {
        window.location.href = "/";
      } else {
        setError("Account created but could not log in automatically. Please sign in.");
        setMode("login");
        setLoading(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      window.location.href = "/";
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Banjo <span className="text-[#3b82f6]">Trades</span>
          </h1>
          <p className="text-[#64748b] text-sm mt-2">
            Trading dashboard &amp; analysis toolkit
          </p>
        </div>

        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-8">
          <h2 className="text-lg font-semibold text-white mb-6 text-center">
            {mode === "login" ? "Sign in to continue" : "Create an account"}
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#475569] focus:outline-none focus:border-[#3b82f6] transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#475569] focus:outline-none focus:border-[#3b82f6] transition-colors"
                placeholder="Min 6 characters"
              />
            </div>
            {mode === "signup" && (
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className={`w-full bg-[#0a0e17] border rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#475569] focus:outline-none transition-colors ${
                    confirmPassword && password !== confirmPassword
                      ? "border-red-500/50 focus:border-red-500"
                      : "border-[#1e293b] focus:border-[#3b82f6]"
                  }`}
                  placeholder="Re-enter your password"
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-red-400 text-xs mt-1.5">Passwords do not match</p>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || (mode === "signup" && password !== confirmPassword)}
              className="w-full bg-[#3b82f6] text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#1e293b]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#111827] px-3 text-[#475569]">or</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {loading ? "Redirecting..." : "Continue with Google"}
          </button>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); setConfirmPassword(""); }}
              className="text-[#3b82f6] text-sm hover:underline"
            >
              {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-[#475569] text-xs">
              By signing in, you agree to our terms of service
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
