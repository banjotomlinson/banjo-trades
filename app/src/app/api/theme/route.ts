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
    .from("user_theme")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code === "PGRST116") {
    // No row yet, return defaults
    return Response.json({ theme: null });
  }

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ theme: data });
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

  // Whitelist allowed fields
  const allowed = [
    "preset",
    "bg_page",
    "bg_panel",
    "bg_border",
    "accent_primary",
    "accent_success",
    "accent_danger",
    "accent_warning",
    "session_asia",
    "session_london",
    "session_ny",
  ];

  const updates: Record<string, string> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }

  const { data, error } = await supabase
    .from("user_theme")
    .upsert({ user_id: user.id, ...updates }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ theme: data });
}
