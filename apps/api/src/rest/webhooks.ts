import type { Hono } from "hono";
import type { ApiEnv } from "../types/hono-env";

export function registerWebhookRoutes(app: Hono<ApiEnv>) {
  const HTTP = {
    OK: 200,
    FORBIDDEN: 403,
  } as const;
  // Meta (WhatsApp Cloud & Instagram) verification
  app.get("/webhooks/meta", (c) => {
    const mode = c.req.query("hub.mode");
    const token = c.req.query("hub.verify_token");
    const challenge = c.req.query("hub.challenge");
    if (mode && token && challenge && token === process.env.META_VERIFY_TOKEN) {
      return c.text(challenge, HTTP.OK);
    }
    return c.text("Forbidden", HTTP.FORBIDDEN);
  });

  // Meta inbound events
  app.post("/webhooks/meta", async (c) => {
    // TODO: validate X-Hub-Signature-256
    const _body = await c.req.json().catch(() => ({}));
    // no-op placeholder
    return c.json({ ok: true });
  });

  // Twilio inbound messages & status callbacks
  app.post("/webhooks/twilio", async (c) => {
    // TODO: validate Twilio signature
    const _form = await c.req.parseBody();
    return c.json({ ok: true });
  });
}
