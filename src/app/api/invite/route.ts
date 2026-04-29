import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendInviteEmail } from "@/lib/email/invite";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// POST /api/invite  { email, adminSecret }
// You call this manually (or from a Supabase dashboard trigger) to send
// someone their create-account invite link.
export async function POST(req: NextRequest) {
  let body: { email?: string; adminSecret?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  // Simple secret check — add ADMIN_SECRET to your Vercel env vars.
  const expectedSecret = process.env.ADMIN_SECRET;
  if (!expectedSecret || body.adminSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const supa = admin();
  if (!supa) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  // Look up their name from the waitlist
  const { data: signup } = await supa
    .from("waitlist_signups")
    .select("name")
    .eq("email", email)
    .maybeSingle();

  await sendInviteEmail({ name: signup?.name ?? null, email });

  return NextResponse.json({ ok: true, message: `Invite sent to ${email}` });
}
