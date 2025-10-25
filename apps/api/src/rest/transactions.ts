import type { Context, Hono } from "hono";
import type { ApiEnv } from "../types/hono-env";

export function registerTransactionsRoutes(app: Hono<ApiEnv>) {
  // Upload attachment to storage (vault bucket)
  app.post("/transactions/uploads", handleUploadTransactionAttachment);
}

const HTTP = {
  BAD_REQUEST: 400,
  PAYLOAD_TOO_LARGE: 413,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/* biome-ignore lint/style/noMagicNumbers: configuration constant for 25MB upload limit */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

async function handleUploadTransactionAttachment(c: Context<ApiEnv>): Promise<Response> {
  try {
    const form = await c.req.formData();
    const val = form.get("file");
    if (!val) {
      return c.json({ error: "file is required" }, HTTP.BAD_REQUEST);
    }
    if (!(val instanceof File)) {
      return c.json({ error: "invalid file" }, HTTP.BAD_REQUEST);
    }
    const file = val as File;
    if ((file.size ?? 0) > MAX_UPLOAD_BYTES) {
      return c.json({ error: "file too large" }, HTTP.PAYLOAD_TOO_LARGE);
    }

    const supabase = c.get("supabaseAdmin");
    const id = crypto.randomUUID();
    const safeName = file.name || id;
    const day = new Date().toISOString().slice(0, 10);
    const path = `transactions/${day}/${id}_${safeName}`;

    const { error: upErr } = await supabase.storage.from("vault").upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
    if (upErr) {
      return c.json({ error: upErr.message }, HTTP.INTERNAL_SERVER_ERROR);
    }
    return c.json({
      path,
      contentType: file.type || null,
      filename: safeName,
      size: file.size ?? null,
    });
  } catch (e: any) {
    return c.json({ error: String(e?.message || e) }, HTTP.INTERNAL_SERVER_ERROR);
  }
}
