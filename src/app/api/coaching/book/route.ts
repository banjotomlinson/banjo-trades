import { after, NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  sendCoachingAdminNotification,
  sendCoachingBookerConfirmation,
} from "@/lib/email/coaching";

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
  starts_at?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLOT_MINUTES = 30;
const DAY_START_HOUR = 9;
const DAY_END_HOUR = 19;

function isValidSlot(d: Date): boolean {
  if (Number.isNaN(d.getTime())) return false;
  if (d.getTime() < Date.now()) return false;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value);
  const m = Number(parts.find((p) => p.type === "minute")?.value);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  if (m % SLOT_MINUTES !== 0) return false;
  if (h < DAY_START_HOUR) return false;
  if (h >= DAY_END_HOUR) return false;
  return true;
}

export async function POST(req: NextRequest) {
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = (body.name ?? "").trim().slice(0, 200);
  const email = (body.email ?? "").trim().toLowerCase();
  const startsAt = body.starts_at ? new Date(body.starts_at) : null;

  if (!name) {
    return NextResponse.json({ error: "Enter your name" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }
  if (!startsAt || !isValidSlot(startsAt)) {
    return NextResponse.json(
      { error: "Pick a slot between 9:00 and 18:30 London time" },
      { status: 400 }
    );
  }

  const supa = admin();
  if (!supa) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 }
    );
  }

  // Check for double-booking
  const { data: existing } = await supa
    .from("coaching_sessions")
    .select("id")
    .eq("starts_at", startsAt.toISOString())
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: "That slot is already booked. Pick another time." },
      { status: 409 }
    );
  }

  // Create or find the user account via Supabase Auth
  let userId: string | null = null;

  const { data: existingUsers } = await supa.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email
  );

  if (existingUser) {
    userId = existingUser.id;
    if (name && existingUser.user_metadata?.full_name !== name) {
      await supa.auth.admin.updateUserById(existingUser.id, {
        user_metadata: { full_name: name },
      });
    }
  } else {
    const tempPassword = crypto.randomUUID();
    const { data: newUser, error: signupErr } = await supa.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (signupErr) {
      return NextResponse.json(
        { error: "Could not create your account. Try again." },
        { status: 500 }
      );
    }
    userId = newUser.user?.id ?? null;
  }

  // Insert the coaching session
  const { error: insertErr } = await supa.from("coaching_sessions").insert({
    user_id: userId,
    email,
    name,
    starts_at: startsAt.toISOString(),
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json(
        { error: "That slot is already booked. Pick another time." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Could not save the booking. Try again." },
      { status: 500 }
    );
  }

  after(async () => {
    const results = await Promise.allSettled([
      sendCoachingAdminNotification({ name, email, startsAt, topic: null }),
      sendCoachingBookerConfirmation({ name, email, startsAt, topic: null }),
    ]);
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(
          `[coaching] ${i === 0 ? "admin" : "booker"} email rejected`,
          r.reason
        );
      }
    });
  });

  return NextResponse.json({ ok: true });
}
