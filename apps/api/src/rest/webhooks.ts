import type { Hono } from "hono";
import type { ApiEnv } from "../types/hono-env";

export function registerWebhookRoutes(app: Hono<ApiEnv>) {
  // Meta (WhatsApp Cloud & Instagram) verification
  app.get("/webhooks/meta", (c) => {
    const mode = c.req.query("hub.mode");
    const token = c.req.query("hub.verify_token");
    const challenge = c.req.query("hub.challenge");
    if (mode && token && challenge && token === process.env.META_VERIFY_TOKEN) {
      return c.text(challenge, 200);
    }
    return c.text("Forbidden", 403);
  });

  // Meta inbound events
  app.post("/webhooks/meta", async (c) => {
    // TODO: validate X-Hub-Signature-256
    const body = await c.req.json().catch(() => ({}));
    // no-op placeholder
    return c.json({ ok: true });
  });

  // Twilio inbound messages & status callbacks
  app.post("/webhooks/twilio", async (c) => {
    // TODO: validate Twilio signature
    const form = await c.req.parseBody();
    return c.json({ ok: true });
  });
}
