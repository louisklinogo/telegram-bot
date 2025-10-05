"use client";

import { format } from "date-fns";
import { Image as ImageIcon, Paperclip, Send, Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { InboxMessage } from "@/types/inbox";

interface InboxDetailsProps {
  message: InboxMessage | null;
}

export function InboxDetails({ message }: InboxDetailsProps) {
  const [items, setItems] = useState<
    {
      id: string;
      sender: "customer" | "business";
      type: "text" | "image" | "video" | "document";
      content: string;
      created_at: string;
      attachments?: { id: string; content_type: string }[];
      delivered_at?: string | null;
      read_at?: string | null;
    }[]
  >([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const threadId = message?.id ?? null;

  const fetchMessages = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${base}/communications/threads/${threadId}/messages?limit=50`, {
        cache: "no-store",
      });
      const json = await res.json();
      const mapped = Array.isArray(json?.items)
        ? json.items.map((m: any) => ({
            id: m.id,
            sender: m.direction === "in" ? "customer" : "business",
            type: (m.type as "text" | "image" | "video" | "document") || "text",
            content: m.content || "",
            created_at: m.created_at,
            attachments: m.attachments || [],
            delivered_at: m.delivered_at || null,
            read_at: m.read_at || null,
          }))
        : [];
      setItems(mapped);
      setNextCursor(json?.nextCursor || null);
    } catch {}
  };

  const loadOlder = async () => {
    try {
      if (!items.length) return;
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const before = encodeURIComponent(items[0].created_at);
      const res = await fetch(
        `${base}/communications/threads/${threadId}/messages?limit=50&before=${before}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      const mapped = Array.isArray(json?.items)
        ? json.items.map((m: any) => ({
            id: m.id,
            sender: m.direction === "in" ? "customer" : "business",
            type: (m.type as "text" | "image" | "video" | "document") || "text",
            content: m.content || "",
            created_at: m.created_at,
            attachments: m.attachments || [],
            delivered_at: m.delivered_at || null,
            read_at: m.read_at || null,
          }))
        : [];
      setItems((prev) => [...mapped, ...prev]);
      setNextCursor(json?.nextCursor || null);
    } catch {}
  };

  const send = async () => {
    if (!text.trim()) return;
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

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !threadId) return;
      setUploading(true);
      const mediaType = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : file.type.startsWith("audio/")
            ? "audio"
            : "document";
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const form = new FormData();
      form.append("file", file, file.name);
      const upRes = await fetch(`${base}/communications/uploads`, {
        method: "POST",
        body: form,
      });
      if (!upRes.ok) {
        const err = await upRes.json().catch(() => ({}));
        throw new Error(err?.error || `Upload failed (${upRes.status})`);
      }
      const upJson = (await upRes.json()) as { path: string; contentType?: string; filename?: string };
      const path = upJson.path;
      const safeName = upJson.filename || file.name;
      const clientMessageId =
        typeof crypto !== "undefined" && (crypto as any).randomUUID
          ? (crypto as any).randomUUID()
          : Math.random().toString(36).slice(2);
      await fetch(`${base}/communications/threads/${threadId}/send-media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaPath: path,
          mediaType,
          filename: safeName,
          caption: text || undefined,
          clientMessageId,
        }),
      });
      setText("");
      fetchMessages();
    } catch (err) {
      // noop; could show toast
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    fetchMessages();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchMessages, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 border-b p-4">
        {message ? (
          <>
            <Avatar className="h-10 w-10">
              <AvatarImage src={message.customerAvatar} />
              <AvatarFallback>{getInitials(message.customerName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{message.customerName}</h3>
                {message.platform === "whatsapp" ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    WhatsApp
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border-purple-200"
                  >
                    Instagram
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {message.phoneNumber || message.instagramHandle}
              </p>
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Select a conversation</div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" hideScrollbar>
        <div className="space-y-4">
          {nextCursor && (
            <div className="flex justify-center">
              <button className="text-xs text-primary underline" onClick={loadOlder}>
                Load older
              </button>
            </div>
          )}
          {items.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex", msg.sender === "customer" ? "justify-start" : "justify-end")}
            >
              <div
                className={cn(
                  "max-w-[70%] rounded-lg px-4 py-2",
                  msg.sender === "customer" ? "bg-muted" : "bg-primary text-primary-foreground",
                )}
              >
                {msg.type === "image" && msg.attachments && msg.attachments.length > 0 && (
                  <div className="mb-2">
                    <AttachmentPreview
                      attachmentId={msg.attachments[0].id}
                      contentType={msg.attachments[0].content_type}
                    />
                  </div>
                )}
                <p className="text-sm">{msg.content}</p>
                <div className="mt-1 flex items-center gap-1 text-xs opacity-70">
                  <span>{format(new Date(msg.created_at), "HH:mm")}</span>
                  {msg.sender === "business" && (
                    <span>{msg.read_at ? "✓✓" : msg.delivered_at ? "✓✓" : "✓"}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input Footer */}
      <TooltipProvider>
        <div className="border-t p-4">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" disabled>
                  <Smile className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Coming soon: Emoji picker</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={onFileChange}
                  />
                  <Button variant="ghost" size="icon" onClick={onPickFile} disabled={uploading}>
                    <Paperclip className="h-5 w-5" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attach image/video/document</p>
              </TooltipContent>
            </Tooltip>

            <Input
              placeholder="Type a message..."
              className="flex-1"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={send} disabled={sending || uploading || !threadId}>
                  <Send className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Send</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}

function AttachmentPreview({
  attachmentId,
  contentType,
}: {
  attachmentId: string;
  contentType: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    fetch(`${base}/communications/attachments/${attachmentId}/url`)
      .then((r) => r.json())
      .then((j) => setUrl(j?.url || null))
      .catch(() => {});
  }, [attachmentId]);
  if (!url) return <div className="text-xs text-muted-foreground">Loading attachment…</div>;
  if ((contentType || "").startsWith("image/"))
    return <img src={url} alt="attachment" className="rounded max-w-full h-auto" />;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="underline text-xs">
      Download
    </a>
  );
}
