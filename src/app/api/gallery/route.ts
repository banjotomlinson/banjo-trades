import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .from("gallery_images")
    .select("id, name, storage_path, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const images = await Promise.all(
    (rows ?? []).map(async (row) => {
      const { data: signed } = await supabase.storage
        .from("gallery")
        .createSignedUrl(row.storage_path, 3600);
      return {
        id: row.id,
        name: row.name,
        url: signed?.signedUrl ?? "",
        storage_path: row.storage_path,
      };
    })
  );

  return Response.json({ images });
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
    return Response.json({ error: "Missing image id" }, { status: 400 });
  }

  const { data: row } = await supabase
    .from("gallery_images")
    .select("storage_path")
    .eq("user_id", user.id)
    .eq("id", body.id)
    .single();

  if (row?.storage_path) {
    await supabase.storage.from("gallery").remove([row.storage_path]);
  }

  const { error } = await supabase
    .from("gallery_images")
    .delete()
    .eq("user_id", user.id)
    .eq("id", body.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
