import type { Context, Hono } from "hono";
import type { ApiEnv } from "../types/hono-env";

export function registerProductsRoutes(app: Hono<ApiEnv>) {
  // Upload product media to storage (product-media bucket)
  app.post("/products/uploads", handleUploadProductMedia);

  // Copy external URL into storage (server downloads and uploads to product-media bucket)
  app.post("/products/uploads/url", handleUploadFromUrl);
}

const HTTP = {
  BAD_REQUEST: 400,
  PAYLOAD_TOO_LARGE: 413,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/* biome-ignore lint/style/noMagicNumbers: configuration constant for 25MB upload limit */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB
const HTTP_URL_REGEX = /^https?:\/\//i;

async function handleUploadProductMedia(c: Context<ApiEnv>): Promise<Response> {
  try {
    const form = await c.req.formData();
    const val = form.get("file");
    const productId = form.get("productId");
    if (!val) {
      return c.json({ error: "file is required" }, HTTP.BAD_REQUEST);
    }
    if (!(val instanceof File)) {
      return c.json({ error: "invalid file" }, HTTP.BAD_REQUEST);
    }
    if (!productId || typeof productId !== "string") {
      return c.json({ error: "productId is required" }, HTTP.BAD_REQUEST);
    }

    const file = val as File;
    if ((file.size ?? 0) > MAX_UPLOAD_BYTES) {
      return c.json({ error: "file too large" }, HTTP.PAYLOAD_TOO_LARGE);
    }

    const supabase = c.get("supabaseAdmin");
    const teamId = c.get("teamId") as string;
    const id = crypto.randomUUID();
    const safeName = file.name || id;
    const path = `${teamId}/${productId}/${id}_${safeName}`;

    const { error: upErr } = await supabase.storage.from("product-media").upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (upErr) {
      return c.json({ error: upErr.message }, HTTP.INTERNAL_SERVER_ERROR);
    }
    const { data: pub } = supabase.storage.from("product-media").getPublicUrl(path);

    return c.json({
      path,
      url: pub.publicUrl,
      contentType: file.type || null,
      filename: safeName,
      size: file.size ?? null,
    });
  } catch (e: any) {
    return c.json({ error: String(e?.message || e) }, HTTP.INTERNAL_SERVER_ERROR);
  }
}

async function handleUploadFromUrl(c: Context<ApiEnv>): Promise<Response> {
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
    if (!(url && HTTP_URL_REGEX.test(url))) {
      return c.json({ error: "valid url is required" }, HTTP.BAD_REQUEST);
    }
    if (!productId) {
      return c.json({ error: "productId is required" }, HTTP.BAD_REQUEST);
    }

    const teamId = c.get("teamId") as string;
    const supabase = c.get("supabaseAdmin");

    const resp = await fetch(url);
    if (!resp.ok) {
      return c.json({ error: `fetch failed: ${resp.status}` }, HTTP.BAD_REQUEST);
    }
    const arrayBuffer = await resp.arrayBuffer();
    const size = arrayBuffer.byteLength;
    if (size > MAX_UPLOAD_BYTES) {
      return c.json({ error: "file too large" }, HTTP.PAYLOAD_TOO_LARGE);
    }

    const contentType = resp.headers.get("content-type") || "application/octet-stream";
    const urlPath = (() => {
      try {
        return new URL(url).pathname;
      } catch {
        return "/";
      }
    })();
    const baseName = urlPath.split("/").filter(Boolean).pop() || "file";
    const id = crypto.randomUUID();
    const safeName = `${id}_${baseName}`;
    const path = `${teamId}/${productId}/${safeName}`;

    const { error: upErr } = await supabase.storage.from("product-media").upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });
    if (upErr) {
      return c.json({ error: upErr.message }, HTTP.INTERNAL_SERVER_ERROR);
    }
    const { data: pub } = supabase.storage.from("product-media").getPublicUrl(path);

    return c.json({ path, url: pub.publicUrl, contentType, filename: safeName, size });
  } catch (e: any) {
    return c.json({ error: String(e?.message || e) }, HTTP.INTERNAL_SERVER_ERROR);
  }
}
