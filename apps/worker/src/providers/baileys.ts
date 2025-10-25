import { createServerClient } from "@Faworra/supabase";
import makeWASocket, {
  DisconnectReason,
  downloadContentFromMessage,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WAMessage,
  type WASocket,
} from "@whiskeysockets/baileys";
import path from "path";
import { Registry } from "./registry";

type AccountRow = { id: string; team_id: string; external_id: string; status: string };

export async function startBaileysForAccount(acc: AccountRow) {
  if (Registry.has(acc.id)) return;
  const sessionDir = path.join(process.cwd(), "apps", "worker", ".sessions", acc.id);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();
  const supabase = createServerClient();

  let sock: WASocket | null = null;

  async function init() {
    sock = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: false,
      browser: ["Faworra", "Desktop", "1.0.0"],
    });
    Registry.set(acc.id, sock);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        await supabase
          .from("communication_accounts")
          .update({ status: "qr_pending", credentials_encrypted: JSON.stringify({ qr }) })
          .eq("id", acc.id);
      }
      if (connection === "open") {
        await supabase
          .from("communication_accounts")
          .update({ status: "connected", credentials_encrypted: null })
          .eq("id", acc.id);
      }
      if (connection === "close") {
        const shouldReconnect =
          (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
        await supabase
          .from("communication_accounts")
          .update({ status: shouldReconnect ? "disconnected" : "logged_out" })
          .eq("id", acc.id);
        Registry.delete(acc.id);
        if (shouldReconnect) init();
      }
    });

    sock.ev.on("messages.upsert", async (m) => {
      if (m.type !== "notify") return;
      for (const msg of m.messages) {
        await handleMessage(acc, msg).catch((e) =>
          console.error("baileys handle message error", e)
        );
      }
    });

    // Delivery & read receipts for outbound messages
    sock.ev.on("message-receipt.update", async (updates) => {
      try {
        const supabase2 = createServerClient();
        for (const u of updates) {
          const keyId = u.key?.id;
          if (!keyId) continue;
          const status = (u.receipt as any)?.type as string | undefined; // 'read' | 'delivery' | 'played'
          if (!status) continue;
          const patch: any = {};
          if (status === "delivery") patch.delivered_at = new Date().toISOString();
          if (status === "read") patch.read_at = new Date().toISOString();
          if (Object.keys(patch).length === 0) continue;
          await supabase2
            .from("communication_messages")
            .update(patch)
            .eq("provider_message_id", keyId)
            .eq("team_id", acc.team_id);
        }
      } catch (e) {
        console.error("baileys receipt update error", e);
      }
    });
  }

  await init();
}

async function handleMessage(acc: { id: string; team_id: string }, msg: WAMessage) {
  const supabase = createServerClient();
  const remoteJid = msg.key.remoteJid || "";
  const fromMe = !!msg.key.fromMe;
  const providerMessageId = msg.key.id || null;
  const externalContactId = (remoteJid.split("@")[0] || "").replace(/\D/g, "");
  const direction = fromMe ? "out" : "in";
  const content = extractText(msg) || null;
  const type = detectType(msg);
  const mediaDesc = extractMediaDescriptor(msg);

  // Drop pure status/protocol messages: no text and no media
  if (!(content || mediaDesc)) {
    return;
  }

  // Ensure thread exists
  const { data: thread, error: threadErr } = await supabase
    .from("communication_threads")
    .select("id")
    .eq("account_id", acc.id)
    .eq("external_contact_id", externalContactId)
    .maybeSingle();

  let threadId = thread?.id as string | undefined;
  if (!threadId) {
    const { data: created, error: createErr } = await supabase
      .from("communication_threads")
      .insert({
        team_id: acc.team_id,
        account_id: acc.id,
        channel: "whatsapp",
        external_contact_id: externalContactId,
        status: "open",
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (createErr) throw createErr;
    threadId = created.id as string;
  }

  // Ensure whatsapp contact exists and link to thread
  let contactId: string | null = null;
  {
    const { data: contact } = await supabase
      .from("whatsapp_contacts")
      .select("id")
      .eq("team_id", acc.team_id)
      .eq("wa_id", externalContactId)
      .maybeSingle();
    if (contact?.id) {
      contactId = contact.id as string;
    } else {
      const { data: createdContact } = await supabase
        .from("whatsapp_contacts")
        .insert({ team_id: acc.team_id, wa_id: externalContactId })
        .select("id")
        .single();
      contactId = createdContact?.id as string;
    }
    if (contactId) {
      await supabase
        .from("communication_threads")
        .update({ whatsapp_contact_id: contactId })
        .eq("id", threadId);
    }
  }

  // Insert message and return id
  const { data: createdMsg, error: insErr } = await supabase
    .from("communication_messages")
    .insert({
      team_id: acc.team_id,
      thread_id: threadId!,
      provider_message_id: providerMessageId,
      direction,
      type,
      content,
      sent_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (insErr) throw insErr;
  const messageId = createdMsg?.id as string;

  // Handle media attachments
  if (mediaDesc) {
    const { stream, mime, filename } = mediaDesc;
    const buffer = await streamToBuffer(stream);
    const storagePath = `${acc.team_id}/threads/${acc.id}/${Date.now()}_${filename || "file"}`;
    const { error: upErr } = await supabase.storage
      .from("vault")
      .upload(storagePath, buffer, { contentType: mime, upsert: true });
    if (upErr) {
      console.error("media upload error", upErr.message);
    } else {
      await supabase.from("message_attachments").insert({
        message_id: messageId,
        storage_path: storagePath,
        content_type: mime,
        size: buffer.length,
      });
      // Index in files table for Vault
      await supabase.from("files").insert({
        team_id: acc.team_id,
        storage_path: storagePath,
        filename: filename || null,
        content_type: mime,
        size: buffer.length,
        linked_type: "message",
        linked_id: messageId,
      });
    }
  }

  // Update thread timestamp
  await supabase
    .from("communication_threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", threadId);
}

function extractText(msg: WAMessage): string | undefined {
  const m = msg.message as any;
  if (!m) return;
  if (m.conversation) return m.conversation as string;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text as string;
  if (m.imageMessage?.caption) return m.imageMessage.caption as string;
  return;
}

function detectType(msg: WAMessage): string {
  const m = msg.message as any;
  if (!m) return "text";
  if (m.imageMessage) return "image";
  if (m.videoMessage) return "video";
  if (m.documentMessage) return "document";
  if (m.audioMessage) return "audio";
  if (m.stickerMessage) return "sticker";
  return "text";
}

function extractMediaDescriptor(
  msg: WAMessage
): { stream: AsyncGenerator<Buffer>; mime: string; filename?: string } | null {
  const m = msg.message as any;
  if (!m) return null;
  const mime =
    m.imageMessage?.mimetype ||
    m.videoMessage?.mimetype ||
    m.documentMessage?.mimetype ||
    m.audioMessage?.mimetype ||
    m.stickerMessage?.mimetype;
  const fileName = m.documentMessage?.fileName as string | undefined;
  const node = m.imageMessage
    ? m.imageMessage
    : m.videoMessage
      ? m.videoMessage
      : m.documentMessage
        ? m.documentMessage
        : m.audioMessage
          ? m.audioMessage
          : m.stickerMessage
            ? m.stickerMessage
            : null;
  if (!(node && mime)) return null;
  const stream = downloadContentFromMessage(
    node,
    m.imageMessage
      ? "image"
      : m.videoMessage
        ? "video"
        : m.documentMessage
          ? "document"
          : m.audioMessage
            ? "audio"
            : "sticker"
  );
  return { stream, mime, filename: fileName };
}

async function streamToBuffer(stream: AsyncGenerator<Buffer>) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
