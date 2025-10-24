"use server";

import { createServerClient } from "@Faworra/supabase/server";

export async function startBaileysSessionAction() {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const res = await fetch(`${base}/providers/whatsapp/baileys/session/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ externalId: "primary", displayName: "WhatsApp" }),
    // Avoid caching in edge/CDN
    cache: "no-store",
  });

  if (!res.ok) {
    let message = "Failed to start Baileys session";
    try {
      const j = await res.json();
      if (j?.error) message = j.error as string;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}
