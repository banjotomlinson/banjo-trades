import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// First N waitlist signups (by created_at) get auto-approved on first
// sign-in. Anyone past the cap is signed out and sent back to /login with
// a clear error.
const SPOT_CAP = 100;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface CheckResult {
  ok: boolean;
  reason?: "not_on_waitlist" | "past_cap" | "config" | "unknown";
  position?: number;
}

async function checkAndApprove(email: string, userId: string): Promise<CheckResult> {
  const supa = admin();
  if (!supa) return { ok: false, reason: "config" };

  // Already approved (existing users + admins backfilled by 008 migration,
  // plus anyone we've already let through on a previous sign-in).
  const { data: profile } = await supa
    .from("profiles")
    .select("approved_at, role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.approved_at) return { ok: true };

  // Admins always pass.
  if (profile?.role === "admin") {
    await supa
      .from("profiles")
      .update({ approved_at: new Date().toISOString() })
      .eq("id", userId);
    return { ok: true };
  }

  // Otherwise check waitlist position.
  const { data: waitlist, error } = await supa
    .from("waitlist_signups")
    .select("email, created_at")
    .order("created_at", { ascending: true })
    .limit(SPOT_CAP + 200);
  if (error || !waitlist) return { ok: false, reason: "unknown" };

  const target = email.toLowerCase();
  const idx = waitlist.findIndex((r) => r.email.toLowerCase() === target);
  if (idx === -1) return { ok: false, reason: "not_on_waitlist" };
  if (idx >= SPOT_CAP)
    return { ok: false, reason: "past_cap", position: idx + 1 };

  await supa
    .from("profiles")
    .update({ approved_at: new Date().toISOString() })
    .eq("id", userId);
  return { ok: true, position: idx + 1 };
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data?.user?.email || !data.user.id) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const check = await checkAndApprove(data.user.email, data.user.id);
  if (check.ok) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Reject — sign out so middleware doesn't see them as authenticated.
  await supabase.auth.signOut();
  const params = new URLSearchParams({ error: check.reason ?? "not_approved" });
  if (check.position) params.set("position", String(check.position));
  return NextResponse.redirect(`${origin}/login?${params.toString()}`);
}
