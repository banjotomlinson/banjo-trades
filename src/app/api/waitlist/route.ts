import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-only client with the service role key so anon visitors can sign up
// even if their browser session is null. RLS still owns who reads.
function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface Payload {
  email?: string;
  primary_asset?: string;
  experience?: string;
  pain_point?: string;
  source?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }

  const supa = admin();
  if (!supa) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 }
    );
  }

  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? "";

  const { error } = await supa.from("waitlist_signups").insert({
    email,
    primary_asset: body.primary_asset?.slice(0, 80) || null,
    experience: body.experience?.slice(0, 80) || null,
    pain_point: body.pain_point?.slice(0, 1000) || null,
    source: body.source?.slice(0, 80) || null,
    user_agent: userAgent,
  });

  if (error) {
    // Unique violation = already signed up. Treat as success.
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, alreadyJoined: true });
    }
    return NextResponse.json(
      { error: error.message ?? "Failed to save" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
