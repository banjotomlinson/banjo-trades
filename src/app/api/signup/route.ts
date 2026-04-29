import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyInviteToken } from "@/lib/invite";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;

export async function POST(req: NextRequest) {
  let body: {
    token?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    timezone?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { token, firstName, lastName, email, password, timezone } = body;

  if (!token) return NextResponse.json({ error: "Missing invite token" }, { status: 400 });
  if (!firstName?.trim()) return NextResponse.json({ error: "First name is required" }, { status: 400 });
  if (!lastName?.trim()) return NextResponse.json({ error: "Last name is required" }, { status: 400 });
  if (!email?.trim() || !EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  if (!password || password.length < PASSWORD_MIN) return NextResponse.json({ error: `Password must be at least ${PASSWORD_MIN} characters` }, { status: 400 });

  const verified = verifyInviteToken(token);
  if (!verified) return NextResponse.json({ error: "Invite link is invalid or has expired. Please contact us for a new one." }, { status: 400 });
  if (verified.email !== email.toLowerCase().trim()) {
    return NextResponse.json({ error: "Email doesn't match the invite. Use the email address the invite was sent to." }, { status: 400 });
  }

  const supa = admin();
  if (!supa) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const displayName = `${firstName.trim()} ${lastName.trim()}`;
  const tz = timezone?.trim() || "auto";

  const { data: created, error: createErr } = await supa.auth.admin.createUser({
    email: email.toLowerCase().trim(),
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (createErr) {
    if (createErr.message?.toLowerCase().includes("already")) {
      return NextResponse.json({ error: "An account with this email already exists. Head to the login page." }, { status: 409 });
    }
    return NextResponse.json({ error: createErr.message ?? "Failed to create account" }, { status: 500 });
  }

  const userId = created.user.id;

  await supa.from("profiles").upsert({
    id: userId,
    display_name: displayName,
    timezone: tz,
    approved_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
