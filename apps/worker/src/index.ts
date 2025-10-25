import "dotenv/config";
import { createServerClient } from "@Faworra/supabase";
import type { WASocket } from "@whiskeysockets/baileys";
import { startBaileysForAccount } from "./providers/baileys";
import { Registry } from "./providers/registry";

function randomId(len = 24) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[(Math.random() * chars.length) | 0];
  return out;
}

const active = new Set<string>();

async function tick() {
  const supabase = createServerClient();
  // Start/resume sessions for relevant statuses
  const { data, error } = await supabase
    .from("communication_accounts")
    .select("id, provider, external_id, status, team_id")
    .eq("provider", "whatsapp_baileys")
    .in("status", ["connecting", "qr_pending", "connected", "disconnected"]);

  if (error) {
    console.error("worker: failed to query accounts", error.message);
    return;
  }

  for (const acc of data ?? []) {
    if (active.has(acc.id)) continue;
    active.add(acc.id);
    console.log("worker: ensuring Baileys session for", acc.external_id, `(status=${acc.status})`);
    // Start (or resume) Baileys for this account; do not await to keep loop responsive
    startBaileysForAccount(acc as any)
      .catch((e) => console.error("worker: start session error", e))
      .finally(() => active.delete(acc.id));
  }
}

async function main() {
  console.log("worker: starting");
  // poll accounts
  setInterval(() => {
    tick().catch((e) => console.error("worker tick error", e));
  }, 5000);

  // poll outbox
  setInterval(() => {
    processOutbox().catch((e) => console.error("worker outbox error", e));
  }, 2000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

async function processOutbox() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("communication_outbox")
    .select(
      "id, account_id, recipient, content, team_id, client_message_id, media_path, media_type, media_filename, caption"
    )
    .eq("status", "queued")
    .limit(10);
  if (error) throw error;
  for (const job of data ?? []) {
    const sock = Registry.get(job.account_id) as WASocket | null;
    if (!sock) continue;
    try {
      const jid = formatJid(job.recipient);
      // Idempotency: if client_message_id already materialized as message, skip send
      if (job.client_message_id) {
        const { data: existing } = await supabase
          .from("communication_messages")
          .select("id")
          .eq("team_id", job.team_id)
          .eq("client_message_id", job.client_message_id)
          .maybeSingle();
        if (existing?.id) {
          await supabase
            .from("communication_outbox")
            .update({ status: "sent", error: null })
            .eq("id", job.id);
          continue;
        }
      }
      let sent,
        providerMessageId: string | null = null,
        msgType = "text";
      const threadId = await ensureThread(job.account_id, jid, job.team_id, supabase);
      if (job.media_path && job.media_type) {
        msgType = job.media_type;
        // download from storage
        const { data: fileData, error: dlErr } = await supabase.storage
          .from("vault")
          .download(job.media_path);
        if (dlErr || !fileData) throw dlErr || new Error("download failed");
        const arrayBuf = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        if (job.media_type === "image") {
          sent = await sock.sendMessage(jid, { image: buffer, caption: job.caption || undefined });
        } else if (job.media_type === "document") {
          sent = await sock.sendMessage(jid, {
            document: buffer,
            mimetype: undefined,
            fileName: job.media_filename || "file",
          });
        } else if (job.media_type === "audio") {
          sent = await sock.sendMessage(jid, { audio: buffer, mimetype: "audio/mpeg" });
        } else if (job.media_type === "video") {
          sent = await sock.sendMessage(jid, { video: buffer, caption: job.caption || undefined });
        } else {
          // fallback to text if unknown
          sent = await sock.sendMessage(jid, { text: job.content || "" });
          msgType = "text";
        }
      } else {
        sent = await sock.sendMessage(jid, { text: job.content });
      }
      providerMessageId = sent?.key?.id || null;
      // insert message record (outbound)
      const { data: created, error: msgErr } = await supabase
        .from("communication_messages")
        .insert({
          team_id: job.team_id,
          thread_id: threadId,
          provider_message_id: providerMessageId,
          direction: "out",
          type: msgType,
          content: job.media_path ? job.caption || null : job.content,
          client_message_id: job.client_message_id || null,
          sent_at: new Date().toISOString(),
        })
        .select("id, thread_id")
        .single();
      if (!msgErr && created?.thread_id) {
        await supabase
          .from("communication_threads")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", created.thread_id as any);
        // create attachment row if media
        if (job.media_path && job.media_type) {
          await supabase.from("message_attachments").insert({
            message_id: created.id as any,
            storage_path: job.media_path,
            content_type: job.media_type,
          });
          await supabase.from("files").insert({
            team_id: job.team_id,
            storage_path: job.media_path,
            filename: job.media_filename || null,
            content_type: job.media_type,
            linked_type: "message",
            linked_id: created.id as any,
          });
        }
      }
      await supabase
        .from("communication_outbox")
        .update({ status: "sent", error: null })
        .eq("id", job.id);
    } catch (e: any) {
      await supabase
        .from("communication_outbox")
        .update({ status: "failed", error: String(e?.message || e) })
        .eq("id", job.id);
    }
  }
}

function formatJid(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}

async function ensureThread(
  accountId: string,
  jid: string,
  teamId: string,
  supabase: ReturnType<typeof createServerClient>
) {
  const externalContactId = jid.split("@")[0];
  const { data: t } = await supabase
    .from("communication_threads")
    .select("id")
    .eq("account_id", accountId)
    .eq("external_contact_id", externalContactId)
    .maybeSingle();
  if (t?.id) return t.id as string;
  const { data: created, error: createErr } = await supabase
    .from("communication_threads")
    .insert({
      team_id: teamId,
      account_id: accountId,
      channel: "whatsapp",
      external_contact_id: externalContactId,
      status: "open",
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (createErr) throw createErr;
  return created.id as string;
}
