import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  sendApplicantWelcome,
  sendWaitlistNotification,
} from "@/lib/email/waitlist";

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
  name?: string;
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

  const cleanName = body.name?.trim().slice(0, 200) || null;
  const cleanPrimaryAsset = body.primary_asset?.slice(0, 80) || null;
  const cleanExperience = body.experience?.slice(0, 80) || null;
  const cleanPainPoint = body.pain_point?.slice(0, 1000) || null;

  const { error } = await supa.from("waitlist_signups").insert({
    email,
    name: cleanName,
    primary_asset: cleanPrimaryAsset,
    experience: cleanExperience,
    pain_point: cleanPainPoint,
    source: body.source?.slice(0, 80) || null,
    user_agent: userAgent,
  });

  if (error) {
    // Unique violation = already signed up. Treat as success — but don't
    // re-fire the email (Banjo already got one when they originally joined).
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, alreadyJoined: true });
    }
    return NextResponse.json(
      { error: error.message ?? "Failed to save" },
      { status: 500 }
    );
  }

  // Count + emails run in the background so the user's submission isn't
  // blocked by slow third-party APIs. Errors get logged inside the helpers.
  (async () => {
    try {
      const { count } = await supa
        .from("waitlist_signups")
        .select("*", { count: "exact", head: true });
      const total = count ?? 0;
      await Promise.all([
        sendWaitlistNotification({
          name: cleanName,
          email,
          primaryAsset: cleanPrimaryAsset,
          experience: cleanExperience,
          painPoint: cleanPainPoint,
          totalCount: total,
        }),
        sendApplicantWelcome({
          name: cleanName,
          email,
          position: total,
        }),
      ]);
    } catch (err) {
      console.error("[waitlist] notification pipeline failed", err);
    }
  })();

  return NextResponse.json({ ok: true });
}
