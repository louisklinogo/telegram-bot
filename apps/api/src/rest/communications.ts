import type { Hono } from "hono";
import type { ApiEnv } from "../types/hono-env";
import type { Database, TablesUpdate } from "@cimantikos/supabase/types";
import { enqueueCommunicationOutbox, createClientBasic, updateCommunicationThread } from "@cimantikos/supabase/mutations";
import { SendMessageSchema, SendThreadMediaSchema, SendThreadTextSchema } from "@cimantikos/schemas";

export function registerCommunicationsRoutes(app: Hono<ApiEnv>) {
  // Upload media to storage (server-side) and return storage path
  app.post("/communications/uploads", async (c) => {
    try {
      const form = await c.req.formData();
      const val = form.get("file");
      if (!val) return c.json({ error: "file is required" }, 400);
      if (!(val instanceof File)) return c.json({ error: "invalid file" }, 400);
      const file = val as File;
      const maxBytes = 25 * 1024 * 1024; // 25MB limit
      const size = file.size ?? 0;
      if (size > maxBytes) return c.json({ error: "file too large" }, 413);

      const supabase = c.get("supabaseAdmin");
      const id = crypto.randomUUID();
      const safeName = file.name || id;
      const day = new Date().toISOString().slice(0, 10);
      const path = `uploads/${day}/${id}_${safeName}`;

      const { error: upErr } = await supabase.storage
        .from("vault")
        .upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        });
      if (upErr) return c.json({ error: upErr.message }, 500);
      return c.json({ path, contentType: file.type || null, filename: safeName });
    } catch (e: any) {
      return c.json({ error: String(e?.message || e) }, 500);
    }
  });
  app.get("/communications/accounts", async (c) => {
    const supabase = c.get("supabaseAdmin");
    const teamId = c.get("teamId");
    const { data, error } = await supabase
      .from("communication_accounts")
      .select("id, provider, external_id")
      .eq("team_id", teamId)
      .limit(100)
      .returns<{ id: string; provider: string; external_id: string }[]>();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ items: data ?? [] });
  });

  app.get("/communications/threads", async (c) => {
    const status = c.req.query("status");
    const supabase = c.get("supabaseAdmin");
    const teamId = c.get("teamId");

    type ThreadListRow = {
      id: string;
      external_contact_id: string;
      last_message_at: string | null;
      status: string;
      account: { provider: string } | null;
      contact: { id: string; name: string; whatsapp: string } | null;
    };

    let query = supabase
      .from("communication_threads")
      .select(
        "id, external_contact_id, last_message_at, status, account:communication_accounts(provider), contact:clients(id, name, whatsapp)",
      )
      .eq("team_id", teamId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(100);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.returns<ThreadListRow[]>();
    if (error) return c.json({ error: error.message }, 500);

    // Fallback: if status provided and empty, return latest regardless of status
    if ((data?.length ?? 0) === 0 && status) {
      const baseQ = supabase
        .from("communication_threads")
        .select(
          "id, external_contact_id, last_message_at, status, account:communication_accounts(provider), contact:clients(id, name, whatsapp)",
        )
        .eq("team_id", teamId)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(100);
      const { data: all, error: err2 } = await baseQ.returns<ThreadListRow[]>();
      if (err2) return c.json({ error: err2.message }, 500);
      return c.json({ items: all ?? [] });
    }

    return c.json({ items: data ?? [] });
  });

  // Enqueue an outbound message for worker to send via provider
  app.post("/communications/messages/send", async (c) => {
    try {
      const supabase = c.get("supabaseAdmin");
      const teamId = c.get("teamId");
      const body = await c.req.json().catch(() => ({}));
      const parsed = SendMessageSchema.safeParse(body);
      if (!parsed.success) return c.json({ error: parsed.error.message }, 400);
      const { externalId, to, text, clientMessageId } = parsed.data;
      const { data: acc, error: accErr } = await supabase
        .from("communication_accounts")
        .select("id, team_id, provider")
        .eq("team_id", teamId)
        .eq("provider", "whatsapp_baileys")
        .eq("external_id", externalId)
        .maybeSingle<{ id: string; team_id: string; provider: string }>();
      if (accErr || !acc) return c.json({ error: "account not found" }, 404);
      // Idempotent enqueue by client_message_id when provided
      const { error: insErr } = await enqueueCommunicationOutbox(supabase, {
        team_id: acc.team_id,
        account_id: acc.id,
        recipient: to,
        content: text,
        status: "queued",
        client_message_id: clientMessageId || null,
      });
      if (insErr) return c.json({ error: insErr.message }, 500);
      return c.json({ enqueued: true, clientMessageId: clientMessageId || null }, 202);
    } catch (e: any) {
      return c.json({ error: String(e?.message || e) }, 500);
    }
  });

  // List messages for a thread
  app.get("/communications/threads/:id/messages", async (c) => {
    try {
      const id = c.req.param("id");
      const before = c.req.query("before");
      const limitParam = c.req.query("limit");
      const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 100);
      const supabase = c.get("supabaseAdmin");
      const teamId = c.get("teamId");
      type MessageRow = {
        id: string;
        direction: string;
        type: string;
        content: string | null;
        sent_at: string | null;
        created_at: string;
        delivered_at: string | null;
        read_at: string | null;
      };

      // Ensure thread belongs to team
      const { data: own, error: ownErr } = await supabase
        .from("communication_threads")
        .select("id")
        .eq("id", id)
        .eq("team_id", teamId)
        .maybeSingle<{ id: string }>();
      if (ownErr || !own) return c.json({ error: "thread not found" }, 404);

      let query = supabase
        .from("communication_messages")
        .select("id, direction, type, content, sent_at, created_at, delivered_at, read_at")
        .eq("thread_id", id)
        .eq("is_status", false)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (before) {
        query = query.lt("created_at", before);
      }

      const { data: msgsDesc, error } = await query.returns<MessageRow[]>();
      const msgs: MessageRow[] = (msgsDesc ?? []).slice().reverse(); // ascending for UI
      if (error) return c.json({ error: error.message }, 500);
      const ids = (msgs ?? []).map((m) => m.id);
      if (!ids.length) return c.json({ items: [] });
      const { data: atts, error: err2 } = await supabase
        .from("message_attachments")
        .select("id, message_id, content_type")
        .in("message_id", ids)
        .returns<{ id: string; message_id: string; content_type: string | null }[]>();
      if (err2) return c.json({ error: err2.message }, 500);
      const byMsg = new Map<string, any[]>();
      for (const a of atts ?? []) {
        const arr = byMsg.get(a.message_id) || [];
        arr.push({ id: a.id, content_type: a.content_type });
        byMsg.set(a.message_id, arr);
      }
      const items = (msgs ?? []).map((m) => ({ ...m, attachments: byMsg.get(m.id) || [] }));
      const nextCursor = items.length ? items[0]?.created_at : null; // load older using 'before'
      return c.json({ items, nextCursor });
    } catch (e: any) {
      return c.json({ error: String(e?.message || e) }, 500);
    }
  });

  // Enqueue send for a given thread
  app.post("/communications/threads/:id/send", async (c) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json().catch(() => ({}));
      const parsed = SendThreadTextSchema.safeParse(body);
      if (!parsed.success) return c.json({ error: parsed.error.message }, 400);
      const { text, clientMessageId } = parsed.data;
      const supabase = c.get("supabaseAdmin");
      const teamId = c.get("teamId");
      const { data: thread, error: tErr } = await supabase
        .from("communication_threads")
        .select("id, account_id, team_id, external_contact_id")
        .eq("id", id)
        .eq("team_id", teamId)
        .maybeSingle<{ id: string; account_id: string; team_id: string; external_contact_id: string }>();
      if (tErr || !thread) return c.json({ error: "thread not found" }, 404);
      const { error: insErr } = await enqueueCommunicationOutbox(supabase, {
        team_id: thread.team_id,
        account_id: thread.account_id,
        recipient: thread.external_contact_id,
        content: text,
        status: "queued",
        client_message_id: clientMessageId || null,
      });
      if (insErr) return c.json({ error: insErr.message }, 500);
      return c.json({ enqueued: true, clientMessageId: clientMessageId || null }, 202);
    } catch (e: any) {
      return c.json({ error: String(e?.message || e) }, 500);
    }
  });

  // Enqueue media for a given thread (storage path in 'vault')
  app.post("/communications/threads/:id/send-media", async (c) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json().catch(() => ({}));
      const parsed = SendThreadMediaSchema.safeParse(body);
      if (!parsed.success) return c.json({ error: parsed.error.message }, 400);
      const { mediaPath, mediaType, caption, filename, clientMessageId } = parsed.data;
      const supabase = c.get("supabaseAdmin");
      const teamId = c.get("teamId");
      const { data: thread, error: tErr } = await supabase
        .from("communication_threads")
        .select("id, account_id, team_id, external_contact_id")
        .eq("id", id)
        .eq("team_id", teamId)
        .maybeSingle<{ id: string; account_id: string; team_id: string; external_contact_id: string }>();
      if (tErr || !thread) return c.json({ error: "thread not found" }, 404);
      const { error: insErr } = await enqueueCommunicationOutbox(supabase, {
        team_id: thread.team_id,
        account_id: thread.account_id,
        recipient: thread.external_contact_id,
        status: "queued",
        client_message_id: clientMessageId || null,
        media_path: mediaPath,
        media_type: mediaType,
        media_filename: filename || null,
        caption: caption || null,
        content: caption || "",
      });
      if (insErr) return c.json({ error: insErr.message }, 500);
      return c.json({ enqueued: true }, 202);
    } catch (e: any) {
      return c.json({ error: String(e?.message || e) }, 500);
    }
  });

  // Contact suggestion for a thread (match by whatsapp/instagram identity -> existing clients)
  app.get("/communications/threads/:id/contact-suggestion", async (c) => {
    try {
      const id = c.req.param("id");
      const supabase = c.get("supabaseAdmin");
      const teamId = c.get("teamId");
      const { data: thread, error: tErr } = await supabase
        .from("communication_threads")
        .select("id, team_id, account_id, external_contact_id, customer_id")
        .eq("id", id)
        .eq("team_id", teamId)
        .maybeSingle<{
          id: string;
          team_id: string;
          account_id: string;
          external_contact_id: string;
          customer_id: string | null;
        }>();
      if (tErr || !thread) return c.json({ error: "thread not found" }, 404);
      // Try matching by clients.whatsapp
      const phone = thread.external_contact_id;
      const { data: matches } = await supabase
        .from("clients")
        .select("id, name, whatsapp")
        .eq("team_id", thread.team_id)
        .eq("whatsapp", phone)
        .limit(5);
      return c.json({
        linkedClientId: thread.customer_id || null,
        externalContactId: thread.external_contact_id,
        suggestions: matches ?? [],
      });
    } catch (e: any) {
      return c.json({ error: String(e?.message || e) }, 500);
    }
  });

  // Promote/link contact to client for a thread
  app.post("/communications/threads/:id/promote", async (c) => {
    try {
      const id = c.req.param("id");
      const { clientId, name } = (await c.req.json().catch(() => ({}))) as {
        clientId?: string;
        name?: string;
      };
      const supabase = c.get("supabaseAdmin");
      const teamId = (c.get as any)("teamId") as string;
      const { data: thread, error: tErr } = await supabase
        .from("communication_threads")
        .select("id, team_id, external_contact_id")
        .eq("id", id)
        .maybeSingle<{ id: string; team_id: string; external_contact_id: string }>();
      if (tErr || !thread) return c.json({ error: "thread not found" }, 404);
      let finalClientId = clientId || null;
      if (!finalClientId) {
      const { data: created, error: cErr } = await createClientBasic(supabase, {
        team_id: thread.team_id,
        name: name || thread.external_contact_id,
        whatsapp: thread.external_contact_id,
      });
        if (cErr) return c.json({ error: cErr.message }, 500);
        finalClientId = created.id as string;
      }
      const updatePayload: TablesUpdate<"communication_threads"> = {
        customer_id: finalClientId,
      };
      const { error: uErr } = await updateCommunicationThread(
        supabase,
        id,
        thread.team_id,
        updatePayload,
      );
      if (uErr) return c.json({ error: uErr.message }, 500);
      return c.json({ linked: true, clientId: finalClientId });
    } catch (e: any) {
      return c.json({ error: String(e?.message || e) }, 500);
    }
  });

  // Signed URL for attachment
  app.get("/communications/attachments/:id/url", async (c) => {
    try {
      const id = c.req.param("id");
      const supabase = c.get("supabaseAdmin");
      const { data: a, error } = await supabase
        .from("message_attachments")
        .select("storage_path")
        .eq("id", id)
        .maybeSingle<{ storage_path: string }>();
      if (error || !a) return c.json({ error: "not found" }, 404);
      const { data: signed, error: sErr } = await supabase.storage
        .from("vault")
        .createSignedUrl(a.storage_path as string, 60);
      if (sErr || !signed?.signedUrl) return c.json({ error: sErr?.message || "sign failed" }, 500);
      return c.json({ url: signed.signedUrl });
    } catch (e: any) {
      return c.json({ error: String(e?.message || e) }, 500);
    }
  });
}
