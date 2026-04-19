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
    .from("chart_preferences")
    .select("slot, symbol, label")
    .eq("user_id", user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ preferences: data ?? [] });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.slot || !body.symbol || !body.label) {
    return Response.json({ error: "Missing slot, symbol, or label" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("chart_preferences")
    .upsert(
      {
        user_id: user.id,
        slot: body.slot,
        symbol: body.symbol,
        label: body.label,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,slot" }
    )
    .select("slot, symbol, label")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ preference: data });
}
