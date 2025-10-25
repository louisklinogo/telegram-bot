"use server";

import { createServerClient } from "@Faworra/supabase/server";

export async function uploadProductMedia(formData: FormData) {
  const file = formData.get("file") as File | null;
  const productId = formData.get("productId") as string | null;

  if (!file) return { error: "No file provided" } as const;
  if (!productId) return { error: "Missing productId" } as const;

  if (!file.type.startsWith("image/")) return { error: "File must be an image" } as const;
  if (file.size > 10 * 1024 * 1024) return { error: "File size must be < 10MB" } as const;

  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" } as const;

    const { data: userRow } = await supabase
      .from("users")
      .select("current_team_id")
      .eq("id", user.id)
      .single<{ current_team_id: string | null }>();

    const teamId = userRow?.current_team_id;
    if (!teamId) return { error: "No team selected" } as const;

    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const key = `${teamId}/${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { data, error } = await supabase.storage
      .from("product-media")
      .upload(key, buffer, { contentType: file.type, upsert: false, cacheControl: "3600" });
    if (error) return { error: error.message } as const;

    const { data: pub } = supabase.storage.from("product-media").getPublicUrl(data.path);
    return { url: pub.publicUrl } as const;
  } catch (e: any) {
    return { error: e?.message || "Upload failed" } as const;
  }
}
