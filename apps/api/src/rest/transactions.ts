import type { Hono } from "hono";
import type { ApiEnv } from "../types/hono-env";

export function registerTransactionsRoutes(app: Hono<ApiEnv>) {
  // Upload attachment to storage (vault bucket)
  app.post("/transactions/uploads", async (c) => {
    try {
      const form = await c.req.formData();
      const val = form.get("file");
      if (!val) return c.json({ error: "file is required" }, 400);
      if (!(val instanceof File)) return c.json({ error: "invalid file" }, 400);
      const file = val as File;
      const maxBytes = 25 * 1024 * 1024; // 25MB limit
      if ((file.size ?? 0) > maxBytes) return c.json({ error: "file too large" }, 413);

      const supabase = c.get("supabaseAdmin");
      const id = crypto.randomUUID();
      const safeName = file.name || id;
      const day = new Date().toISOString().slice(0, 10);
      const path = `transactions/${day}/${id}_${safeName}`;

      const { error: upErr } = await supabase.storage
        .from("vault")
        .upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        });
      if (upErr) return c.json({ error: upErr.message }, 500);
      return c.json({ path, contentType: file.type || null, filename: safeName, size: file.size ?? null });
    } catch (e: any) {
      return c.json({ error: String(e?.message || e) }, 500);
    }
  });
}
