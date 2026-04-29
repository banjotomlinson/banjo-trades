import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(req: NextRequest) {
  const dateParam = req.nextUrl.searchParams.get("date");
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: "Provide ?date=YYYY-MM-DD" }, { status: 400 });
  }

  const supa = admin();
  if (!supa) {
    return NextResponse.json({ booked: [] });
  }

  const dayStart = `${dateParam}T00:00:00Z`;
  const dayEnd = `${dateParam}T23:59:59Z`;

  const { data } = await supa
    .from("coaching_sessions")
    .select("starts_at")
    .gte("starts_at", dayStart)
    .lte("starts_at", dayEnd);

  const booked = (data ?? []).map((r: { starts_at: string }) => new Date(r.starts_at).toISOString());

  return NextResponse.json({ booked });
}
