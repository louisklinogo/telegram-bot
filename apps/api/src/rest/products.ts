import type { Hono } from "hono";
import type { ApiEnv } from "../types/hono-env";

export function registerProductsRoutes(app: Hono<ApiEnv>) {
  // Upload product media to storage (product-media bucket)
  app.post("/products/uploads", async (c) => {
    try {
      const form = await c.req.formData();
      const val = form.get("file");
      const productId = form.get("productId");
      if (!val) return c.json({ error: "file is required" }, 400);
      if (!(val instanceof File)) return c.json({ error: "invalid file" }, 400);
      if (!productId || typeof productId !== "string") return c.json({ error: "productId is required" }, 400);

      const file = val as File;
      const maxBytes = 25 * 1024 * 1024; // 25MB limit
      if ((file.size ?? 0) > maxBytes) return c.json({ error: "file too large" }, 413);

      const supabase = c.get("supabaseAdmin");
      const teamId = c.get("teamId") as string;
      const id = crypto.randomUUID();
      const safeName = file.name || id;
      const path = `${teamId}/${productId}/${id}_${safeName}`;

      const { error: upErr } = await supabase.storage.from("product-media").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (upErr) return c.json({ error: upErr.message }, 500);
      const { data: pub } = supabase.storage.from("product-media").getPublicUrl(path);

      return c.json({
        path,
        url: pub.publicUrl,
        contentType: file.type || null,
        filename: safeName,
        size: file.size ?? null,
      });
    } catch (e: any) {
      return c.json({ error: String(e?.message || e) }, 500);
    }
  });

  // Copy external URL into storage (server downloads and uploads to product-media bucket)
  app.post("/products/uploads/url", async (c) => {
    try {
      let url = "";
      let productId = "";
      const ct = c.req.header("content-type") || "";
      if (ct.includes("application/json")) {
        const body = await c.req.json().catch(() => ({}));
        url = typeof body?.url === "string" ? body.url : "";
        productId = typeof body?.productId === "string" ? body.productId : "";
      } else {
        const form = await c.req.formData();
        url = String(form.get("url") || "");
        productId = String(form.get("productId") || "");
      }
      if (!url || !/^https?:\/\//i.test(url)) return c.json({ error: "valid url is required" }, 400);
      if (!productId) return c.json({ error: "productId is required" }, 400);

      const teamId = c.get("teamId") as string;
      const supabase = c.get("supabaseAdmin");

      const resp = await fetch(url);
      if (!resp.ok) return c.json({ error: `fetch failed: ${resp.status}` }, 400);
      const arrayBuffer = await resp.arrayBuffer();
      const size = arrayBuffer.byteLength;
      const maxBytes = 25 * 1024 * 1024;
      if (size > maxBytes) return c.json({ error: "file too large" }, 413);

      const contentType = resp.headers.get("content-type") || "application/octet-stream";
      const urlPath = (() => {
        try { return new URL(url).pathname; } catch { return "/"; }
      })();
      const baseName = urlPath.split("/").filter(Boolean).pop() || "file";
      const id = crypto.randomUUID();
      const safeName = `${id}_${baseName}`;
      const path = `${teamId}/${productId}/${safeName}`;

      const { error: upErr } = await supabase.storage.from("product-media").upload(path, arrayBuffer, {
        contentType,
        upsert: false,
      });
      if (upErr) return c.json({ error: upErr.message }, 500);
      const { data: pub } = supabase.storage.from("product-media").getPublicUrl(path);

      return c.json({ path, url: pub.publicUrl, contentType, filename: safeName, size });
    } catch (e: any) {
      return c.json({ error: String(e?.message || e) }, 500);
    }
  });
}
