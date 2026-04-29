import { after, NextRequest, NextResponse } from "next/server";
import {
  sendCoachingAdminNotification,
  sendCoachingBookerConfirmation,
} from "@/lib/email/coaching";

interface Payload {
  name?: string;
  email?: string;
  starts_at?: string;
  topic?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Booking is a 30-minute slot starting between 9:00 and 18:30 London time.
// Anything outside that window is rejected so the form can't smuggle in
// a 4am call by hand-crafting the payload.
const SLOT_MINUTES = 30;
const DAY_START_HOUR = 9;
const DAY_END_HOUR = 19;

function isValidSlot(d: Date): boolean {
  if (Number.isNaN(d.getTime())) return false;
  if (d.getTime() < Date.now()) return false;
  // London local hour/minute breakdown.
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
  const topic = body.topic?.trim().slice(0, 1000) || null;
  const startsAt = body.starts_at ? new Date(body.starts_at) : null;

  if (!name) {
    return NextResponse.json({ error: "Tell us your name" }, { status: 400 });
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

  // Email pipeline runs after the response so the user gets immediate
  // confirmation. `after` keeps the serverless function alive on Vercel
  // until the Resend POSTs finish — same pattern as the waitlist route.
  after(async () => {
    const results = await Promise.allSettled([
      sendCoachingAdminNotification({ name, email, startsAt, topic }),
      sendCoachingBookerConfirmation({ name, email, startsAt, topic }),
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
