import { StartBaileysSessionSchema } from "@Faworra/schemas";
import { upsertCommunicationAccount } from "@Faworra/supabase/mutations";
import type { Hono } from "hono";
import type { ApiEnv } from "../types/hono-env";

// Simple in-memory rate limiter (per-process). For production behind a single instance.
const rlStore = new Map<string, { count: number; ts: number }>();
function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const rec = rlStore.get(key);
  if (!rec || now - rec.ts > windowMs) {
    rlStore.set(key, { count: 1, ts: now });
    return { allowed: true };
  }
  if (rec.count >= limit) {
    return { allowed: false };
  }
  rec.count += 1;
  return { allowed: true };
}

const HTTP = {
  OK: 200,
  BAD_REQUEST: 400,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

const RL_WINDOW_MS = 60_000; // 1 minute
const RL_START_LIMIT = 10; // 10 req / minute / IP
const RL_QR_LIMIT = 30; // 30 req / minute / externalId+IP

export function registerProviderRoutes(app: Hono<ApiEnv>) {
  // Start a Baileys session (placeholder until worker integration is ready)
  app.post("/providers/whatsapp/baileys/session/start", async (c) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("cf-connecting-ip") ||
      "unknown";
    const rlKey = `start:${ip}`;
    const rl = rateLimit(rlKey, RL_START_LIMIT, RL_WINDOW_MS);
    if (!rl.allowed) {
      return c.json({ error: "Too many requests" }, HTTP.TOO_MANY_REQUESTS);
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = StartBaileysSessionSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.message }, HTTP.BAD_REQUEST);
    }

    const admin = c.get("supabaseAdmin");
    const teamId = c.get("teamId");
    const { externalId, displayName } = parsed.data;

    // Ensure a default team exists (until auth context provides teamId)
    // Upsert communication account
    const { data, error } = await upsertCommunicationAccount(admin, {
      provider: "whatsapp_baileys",
      external_id: externalId,
      display_name: displayName,
      status: "connecting",
      team_id: teamId!,
    });

    if (error) {
      return c.json({ error: error.message }, HTTP.INTERNAL_SERVER_ERROR);
    }

    // Return placeholder QR info (worker will update via events later)
    return c.json({ account: data, qr: "pending" });
  });

  app.get("/providers/whatsapp/baileys/session/qr", async (c) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("cf-connecting-ip") ||
      "unknown";
    const ext = c.req.query("externalId") || "none";
    const rlKey = `qr:${ext}:${ip}`;
    const rl = rateLimit(rlKey, RL_QR_LIMIT, RL_WINDOW_MS);
    if (!rl.allowed) {
      return c.json({ error: "Too many requests" }, HTTP.TOO_MANY_REQUESTS);
    }

    const externalId = c.req.query("externalId");
    if (!externalId) {
      return c.json({ error: "externalId is required" }, HTTP.BAD_REQUEST);
    }
    const admin = c.get("supabaseAdmin");
    const teamId = c.get("teamId");
    const { data, error } = await admin
      .from("communication_accounts")
      .select("credentials_encrypted, status")
      .eq("provider", "whatsapp_baileys")
      .eq("team_id", teamId)
      .eq("external_id", externalId)
      .limit(1)
      .maybeSingle<{ credentials_encrypted: string | null; status: string }>();
    if (error) {
      return c.json({ error: error.message }, HTTP.INTERNAL_SERVER_ERROR);
    }
    let qr: string | null = null;
    if (data?.credentials_encrypted) {
      try {
        const parsed = JSON.parse(data.credentials_encrypted as unknown as string);
        qr = parsed?.qr ?? null;
      } catch (_err) {
        // ignore: credentials payload may not be valid JSON yet
      }
    }
    return c.json({ status: data?.status ?? "unknown", qr });
  });
}
