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

function parseUploadFromUrlRequest(c: Context<ApiEnv>): Promise<{ url: string; productId: string }> {
  const ct = c.req.header("content-type") || "";
  if (ct.includes("application/json")) {
    return c
      .req
      .json()
      .catch(() => ({}))
      .then((body: any) => ({
        url: typeof body?.url === "string" ? body.url : "",
        productId: typeof body?.productId === "string" ? body.productId : "",
      }));
  }
  return c.req.formData().then((form) => ({
    url: String(form.get("url") || ""),
    productId: String(form.get("productId") || ""),
  }));
}

async function downloadRemote(url: string): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`fetch failed: ${resp.status}`);
  }
  const buffer = await resp.arrayBuffer();
  const contentType = resp.headers.get("content-type") || "application/octet-stream";
  return { buffer, contentType };
}

function buildStoragePath(teamId: string, productId: string, sourceUrl: string) {
  let baseName = "file";
  try {
    const urlPath = new URL(sourceUrl).pathname;
    baseName = urlPath.split("/").filter(Boolean).pop() || baseName;
  } catch (_err) {
    // ignore URL parse errors; use default baseName
  }
  const id = crypto.randomUUID();
  const safeName = `${id}_${baseName}`;
  const path = `${teamId}/${productId}/${safeName}`;
  return { path, safeName };
}

async function handleUploadFromUrl(c: Context<ApiEnv>): Promise<Response> {
  try {
    const { url, productId } = await parseUploadFromUrlRequest(c);
    if (!(url && HTTP_URL_REGEX.test(url))) {
      return c.json({ error: "valid url is required" }, HTTP.BAD_REQUEST);
    }
    if (!productId) {
      return c.json({ error: "productId is required" }, HTTP.BAD_REQUEST);
    }

    const { buffer, contentType } = await downloadRemote(url);
    const size = buffer.byteLength;
    if (size > MAX_UPLOAD_BYTES) {
      return c.json({ error: "file too large" }, HTTP.PAYLOAD_TOO_LARGE);
    }

    const teamId = c.get("teamId") as string;
    const supabase = c.get("supabaseAdmin");
    const { path, safeName } = buildStoragePath(teamId, productId, url);

    const { error: upErr } = await supabase.storage
      .from("product-media")
      .upload(path, buffer, { contentType, upsert: false });
    if (upErr) {
      return c.json({ error: upErr.message }, HTTP.INTERNAL_SERVER_ERROR);
    }
    const { data: pub } = supabase.storage.from("product-media").getPublicUrl(path);

    return c.json({ path, url: pub.publicUrl, contentType, filename: safeName, size });
  } catch (e: any) {
    return c.json({ error: String(e?.message || e) }, HTTP.INTERNAL_SERVER_ERROR);
  }
}
