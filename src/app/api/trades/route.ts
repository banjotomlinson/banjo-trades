import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("trades")
    .select("id, date, pnl, note, created_at")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ trades: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const trades: Array<{ id: string; date: string; pnl: number; note?: string }> =
    Array.isArray(body.trades) ? body.trades : [body];

  const rows = trades.map((t) => ({
    id: t.id,
    user_id: user.id,
    date: t.date,
    pnl: t.pnl,
    note: t.note || null,
  }));

  const { data, error } = await supabase
    .from("trades")
    .upsert(rows, { onConflict: "user_id,id" })
    .select("id, date, pnl, note, created_at");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ trades: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.id) {
    return Response.json({ error: "Missing trade id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("trades")
    .delete()
    .eq("user_id", user.id)
    .eq("id", body.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
