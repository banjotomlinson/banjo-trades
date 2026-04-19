import type { SupabaseClient } from "@supabase/supabase-js";

const MIGRATED_KEY = "banjo-data-migrated";

export async function migrateLocalStorageToSupabase(supabase: SupabaseClient) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATED_KEY) === "true") return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  try {
    await migrateTrades(supabase, user.id);
    await migrateGallery(supabase, user.id);
    await migrateTimezone(supabase, user.id);
    await migrateSidebar(supabase, user.id);

    localStorage.setItem(MIGRATED_KEY, "true");
  } catch {
    // Partial migration is fine, will retry next load
  }
}

async function migrateTrades(supabase: SupabaseClient, userId: string) {
  const raw = localStorage.getItem("banjo-pnl-trades-v1");
  if (!raw) return;

  const trades = JSON.parse(raw);
  if (!Array.isArray(trades) || trades.length === 0) return;

  const { count } = await supabase
    .from("trades")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (count && count > 0) return;

  const rows = trades.map((t: { id: string; date: string; pnl: number; note?: string }) => ({
    id: t.id,
    user_id: userId,
    date: t.date,
    pnl: t.pnl,
    note: t.note || null,
  }));

  await supabase.from("trades").insert(rows);
}

async function migrateGallery(supabase: SupabaseClient, userId: string) {
  const raw = localStorage.getItem("liqGallery");
  if (!raw) return;

  const images = JSON.parse(raw);
  if (!Array.isArray(images) || images.length === 0) return;

  const { count } = await supabase
    .from("gallery_images")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (count && count > 0) return;

  for (const img of images) {
    if (!img.dataUrl) continue;

    const response = await fetch(img.dataUrl);
    const blob = await response.blob();
    const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
    const path = `${userId}/${img.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("gallery")
      .upload(path, blob, { contentType: blob.type });

    if (uploadError) continue;

    await supabase.from("gallery_images").insert({
      id: img.id,
      user_id: userId,
      name: img.name,
      storage_path: path,
    });
  }
}

async function migrateTimezone(supabase: SupabaseClient, userId: string) {
  const tz = localStorage.getItem("banjoTZ");
  if (!tz) return;

  const { data } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .single();

  if (data?.timezone === "auto") {
    await supabase.from("profiles").update({ timezone: tz }).eq("id", userId);
  }
}

async function migrateSidebar(supabase: SupabaseClient, userId: string) {
  const val = localStorage.getItem("banjoSidebarCollapsed");
  if (val === null) return;

  await supabase
    .from("profiles")
    .update({ sidebar_collapsed: val === "true" })
    .eq("id", userId);
}
