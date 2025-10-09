"use server";

import { createServerClient } from "@cimantikos/supabase/server";
import { cookies } from "next/headers";

export async function uploadLogo(formData: FormData) {
  const file = formData.get("file") as File;

  if (!file) {
    return { error: "No file provided" };
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    return { error: "File must be an image" };
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return { error: "File size must be less than 2MB" };
  }

  try {
    const supabase = await createServerClient();

    // Get user session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return { error: "Not authenticated" };
    }

    // Get user's team ID
    const { data: userData } = await supabase
      .from("users")
      .select("current_team_id")
      .eq("id", session.user.id)
      .single<{ current_team_id: string | null }>();

    if (!userData?.current_team_id) {
      return { error: "No team selected" };
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${userData.current_team_id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage.from("invoice-logos").upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      console.error("Upload error:", error);
      return { error: error.message };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("invoice-logos").getPublicUrl(data.path);

    return { url: publicUrl };
  } catch (error) {
    console.error("Upload error:", error);
    return { error: "Failed to upload logo" };
  }
}

export async function deleteLogo(url: string) {
  try {
    const supabase = await createServerClient();

    // Get user session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return { error: "Not authenticated" };
    }

    // Extract path from URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const filePath = pathParts.slice(pathParts.indexOf("invoice-logos") + 1).join("/");

    // Delete from storage
    const { error } = await supabase.storage.from("invoice-logos").remove([filePath]);

    if (error) {
      console.error("Delete error:", error);
      return { error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete error:", error);
    return { error: "Failed to delete logo" };
  }
}
