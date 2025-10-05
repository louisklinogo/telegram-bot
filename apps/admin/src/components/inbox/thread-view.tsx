"use client";

import { useEffect, useRef, useState } from "react";

type Attachment = { id: string; content_type: string };
type Msg = {
  id: string;
  direction: "in" | "out";
  type: string;
  content: string | null;
  sent_at: string | null;
  created_at: string;
  attachments?: Attachment[];
};

export function ThreadView({ threadId }: { threadId: string | null }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [linkState, setLinkState] = useState<{
    loading: boolean;
    linkedClientId?: string | null;
    external?: string;
    suggestions: { id: string; name: string; whatsapp: string }[];
  } | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMessages = async () => {
    if (!threadId) return;
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${base}/communications/threads/${threadId}/messages`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (Array.isArray(json?.items)) setMessages(json.items);
    } catch {}
  };

  const fetchLinkSuggestion = async () => {
    if (!threadId) return;
    try {
      setLinkState((s) => ({ ...(s || { loading: true, suggestions: [] }), loading: true }));
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${base}/communications/threads/${threadId}/contact-suggestion`, {
        cache: "no-store",
      });
      const json = await res.json();
      setLinkState({
        loading: false,
        linkedClientId: json?.linkedClientId || null,
        external: json?.externalContactId,
        suggestions: Array.isArray(json?.suggestions) ? json.suggestions : [],
      });
    } catch {
      setLinkState({ loading: false, linkedClientId: null, external: undefined, suggestions: [] });
    }
  };

  const linkExisting = async (clientId: string) => {
    if (!threadId || !clientId) return;
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    await fetch(`${base}/communications/threads/${threadId}/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    fetchLinkSuggestion();
  };

  const createClient = async (name?: string) => {
    if (!threadId) return;
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    await fetch(`${base}/communications/threads/${threadId}/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    fetchLinkSuggestion();
  };

  const send = async () => {
    if (!threadId || !text.trim()) return;
    setSending(true);
    const clientMessageId =
      typeof crypto !== "undefined" && (crypto as any).randomUUID
        ? (crypto as any).randomUUID()
        : Math.random().toString(36).slice(2);
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    await fetch(`${base}/communications/threads/${threadId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, clientMessageId }),
    });
    setText("");
    fetchMessages();
    setSending(false);
  };

  useEffect(() => {
    if (!threadId) return;
    fetchMessages();
    fetchLinkSuggestion();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchMessages, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [threadId]);

  if (!threadId)
    return (
      <div className="p-6 text-sm text-neutral-500">Select a conversation to view messages</div>
    );

  return (
    <div className="flex flex-col h-full">
      <ContactLinkBar
        threadId={threadId}
        state={linkState}
        onRefresh={fetchLinkSuggestion}
        onLink={linkExisting}
        onCreate={createClient}
      />
      <div className="flex-1 border rounded p-3 overflow-auto space-y-2">
        {messages.length === 0 ? (
          <div className="text-sm text-neutral-500">No messages yet</div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[70%] p-2 rounded ${m.direction === "out" ? "ml-auto bg-green-50 border border-green-100" : "mr-auto bg-white border"}`}
            >
              <div className="text-sm whitespace-pre-wrap">{m.content || ""}</div>
              {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {m.attachments.map((a) => (
                    <AttachmentItem key={a.id} attachment={a} />
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 text-[10px] text-neutral-500 mt-1">
                <span>{new Date(m.sent_at || m.created_at).toLocaleString()}</span>
                {m.direction === "out" && <Ticks message={m} />}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <button
          onClick={send}
          disabled={sending}
          className="border rounded px-4 py-2 text-sm bg-black text-white disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}

function Ticks({ message }: { message: Msg }) {
  // naive ticks: one tick = sent, two ticks = delivered, blue = read
  const delivered = (message as any).delivered_at || (message as any).deliveredAt;
  const read = (message as any).read_at || (message as any).readAt;
  if (read) return <span className="text-sky-500">✓✓</span>;
  if (delivered) return <span>✓✓</span>;
  return <span>✓</span>;
}

function AttachmentItem({ attachment }: { attachment: Attachment }) {
  const [url, setUrl] = useState<string | null>(null);
  const fetchUrl = async () => {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const res = await fetch(`${base}/communications/attachments/${attachment.id}/url`);
    const json = await res.json();
    if (json?.url) setUrl(json.url);
  };
  const isImage = (attachment.content_type || "").startsWith("image/");
  return (
    <div className="border rounded p-2 bg-white">
      {url && isImage ? (
        <img src={url} alt="attachment" className="max-h-64 rounded" />
      ) : (
        <button onClick={fetchUrl} className="text-blue-600 text-xs underline">
          {url ? "Open" : "Load attachment"}
        </button>
      )}
      {url && !isImage && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="ml-2 text-blue-600 text-xs underline"
        >
          Download
        </a>
      )}
    </div>
  );
}

function ContactLinkBar({
  threadId,
  state,
  onRefresh,
  onLink,
  onCreate,
}: {
  threadId: string | null;
  state: any;
  onRefresh: () => void;
  onLink: (id: string) => void;
  onCreate: (name?: string) => void;
}) {
  if (!threadId) return null;
  if (!state) return <div className="mb-2 text-xs text-neutral-500">Loading contact...</div>;
  if (state.loading) return <div className="mb-2 text-xs text-neutral-500">Finding contact...</div>;
  if (state.linkedClientId)
    return (
      <div className="mb-2 text-xs">
        Linked to client •{" "}
        <button onClick={onRefresh} className="underline">
          refresh
        </button>
      </div>
    );
  const [first] = state.suggestions || [];
  return (
    <div className="mb-2 p-2 border rounded bg-amber-50 text-xs flex items-center gap-2">
      <span>No client linked</span>
      {first ? (
        <>
          <span className="text-neutral-600">Suggest:</span>
          <button onClick={() => onLink(first.id)} className="px-2 py-1 border rounded bg-white">
            Link {first.name}
          </button>
        </>
      ) : null}
      <button
        onClick={() => onCreate(state.external)}
        className="px-2 py-1 border rounded bg-white"
      >
        Create client
      </button>
    </div>
  );
}
