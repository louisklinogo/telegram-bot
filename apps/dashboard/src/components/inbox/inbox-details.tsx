"use client";

import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { ArrowLeft, Image as ImageIcon, Paperclip, Send, Smile, X } from "lucide-react";
import { InstagramLogo, WhatsappLogo } from "phosphor-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRealtimeMessages } from "@/hooks/use-realtime-messages";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { InboxMessage } from "@/types/inbox";

interface InboxDetailsProps {
  message: InboxMessage | null;
}

export function InboxDetails({ message }: InboxDetailsProps) {
  const threadId = message?.id ?? null;
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);

  const { messages, isLoading } = useRealtimeMessages(threadId);
  const sendMessage = trpc.communications.messages.send.useMutation();

  const send = async () => {
    if (!threadId) return;

    // If we have attachments, upload and send them first (caption on first media if text provided)
    if (attachments.length > 0) {
      try {
        setUploading(true);
        const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

        for (let i = 0; i < attachments.length; i++) {
          const file = attachments[i];
          const mediaType = file.type.startsWith("image/")
            ? "image"
            : file.type.startsWith("video/")
              ? "video"
              : file.type.startsWith("audio/")
                ? "audio"
                : "document";

          const form = new FormData();
          form.append("file", file, file.name);

          const upRes = await fetch(`${base}/communications/uploads`, {
            method: "POST",
            body: form,
          });
          if (!upRes.ok) {
            const err = await upRes.json().catch(() => ({}) as Record<string, unknown>);
            throw new Error((err as any)?.error || `Upload failed (${upRes.status})`);
          }
          const upJson = (await upRes.json()) as {
            path: string;
            contentType?: string;
            filename?: string;
          };

          const clientMessageId =
            typeof crypto !== "undefined" && (crypto as any).randomUUID
              ? (crypto as any).randomUUID()
              : Math.random().toString(36).slice(2);

          await fetch(`${base}/communications/threads/${threadId}/send-media`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mediaPath: upJson.path,
              mediaType,
              filename: upJson.filename || file.name,
              caption: i === 0 && text.trim() ? text.trim() : undefined,
              clientMessageId,
            }),
          });
        }

        // Clear caption only if it was used as first-media caption and no standalone text message is needed
        setText("");
        setAttachments([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err) {
        console.error("Failed to send media:", err);
      } finally {
        setUploading(false);
      }
      return;
    }

    // Fallback: text-only message
    if (!text.trim()) return;
    const clientMessageId =
      typeof crypto !== "undefined" && (crypto as any).randomUUID
        ? (crypto as any).randomUUID()
        : Math.random().toString(36).slice(2);
    try {
      await sendMessage.mutateAsync({
        threadId,
        text: text.trim(),
        clientMessageId,
      });
      setText("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setAttachments((prev) => [...prev, ...files]);
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: Date; messages: typeof messages }[] = [];
    let currentGroup: { date: Date; messages: typeof messages } | null = null;

    for (const msg of messages) {
      if (!(currentGroup && isSameDay(currentGroup.date, msg.createdAt))) {
        currentGroup = { date: msg.createdAt, messages: [] };
        groups.push(currentGroup);
      }
      currentGroup.messages.push(msg);
    }

    return groups;
  }, [messages]);

  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  // Auto-scroll to bottom on messages change
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, threadId]);

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
                  <Badge
                    className="gap-1 border-green-200 bg-green-50 text-green-700"
                    variant="outline"
                  >
                    <WhatsappLogo size={14} weight="duotone" />
                    WhatsApp
                  </Badge>
                ) : (
                  <Badge
                    className="gap-1 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700"
                    variant="outline"
                  >
                    <InstagramLogo size={14} weight="duotone" />
                    Instagram
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                {message.phoneNumber || message.instagramHandle}
              </p>
            </div>
          </>
        ) : (
          <div className="text-muted-foreground text-sm">Select a conversation</div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" hideScrollbar ref={scrollRef}>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-primary border-b-2" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-muted-foreground">
            <div className="space-y-2">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Start the conversation by sending a message</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedMessages.map((group, groupIndex) => (
              <div className="space-y-4" key={groupIndex}>
                {/* Date Separator */}
                <div className="flex items-center justify-center">
                  <div className="rounded-full bg-muted px-3 py-1 text-muted-foreground text-xs">
                    {formatDateSeparator(group.date)}
                  </div>
                </div>

                {/* Messages in this date group */}
                {group.messages.map((msg, msgIndex) => {
                  const prevMsg = msgIndex > 0 ? group.messages[msgIndex - 1] : null;
                  const showAvatar = !prevMsg || prevMsg.direction !== msg.direction;

                  return (
                    <div
                      className={cn(
                        "flex gap-2",
                        msg.direction === "in" ? "justify-start" : "justify-end"
                      )}
                      key={msg.id}
                    >
                      {msg.direction === "in" && showAvatar && (
                        <Avatar className="mt-1 h-8 w-8">
                          <AvatarImage src={message?.customerAvatar} />
                          <AvatarFallback className="text-xs">
                            {getInitials(message?.customerName || "?")}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {msg.direction === "in" && !showAvatar && <div className="w-8" />}

                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg px-4 py-2",
                          msg.direction === "in" ? "bg-muted" : "bg-primary text-primary-foreground"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                        <div className="mt-1 flex items-center gap-1 text-xs opacity-70">
                          <span>{format(msg.createdAt, "HH:mm")}</span>
                          {msg.direction === "out" && (
                            <span className="ml-1">
                              {msg.readAt ? "✓✓" : msg.deliveredAt ? "✓" : "○"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input Footer */}
      <TooltipProvider>
        <div className="space-y-2 border-t p-4">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, idx) => (
                <div
                  className="flex items-center gap-2 rounded-md bg-muted px-3 py-1 text-xs"
                  key={idx}
                >
                  <span className="max-w-[200px] truncate">{file.name}</span>
                  <button
                    aria-label="Remove attachment"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button disabled size="icon" variant="ghost">
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
                    className="hidden"
                    multiple
                    onChange={onFileChange}
                    ref={fileInputRef}
                    type="file"
                  />
                  <Button disabled={uploading} onClick={onPickFile} size="icon" variant="ghost">
                    <Paperclip className="h-5 w-5" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attach image/video/document</p>
              </TooltipContent>
            </Tooltip>

            <Input
              className="flex-1"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  send();
                } else if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Type a message..."
              value={text}
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button disabled={sendMessage.isPending || uploading || !threadId} onClick={send}>
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
