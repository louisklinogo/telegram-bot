import { createBrowserClient } from "@Faworra/supabase/client";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";

interface Message {
  id: string;
  threadId: string;
  direction: "in" | "out";
  type: "text" | "image" | "video" | "audio" | "document" | "sticker";
  content: string;
  createdAt: Date;
  deliveredAt: Date | null;
  readAt: Date | null;
  status: string;
}

export function useRealtimeMessages(threadId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial messages via tRPC
  const { data: initialMessages } = trpc.communications.messages.list.useQuery(
    { threadId: threadId || "" },
    { enabled: !!threadId }
  );

  useEffect(() => {
    if (initialMessages) {
      setMessages(
        initialMessages.map((m: any) => ({
          ...m,
          createdAt: new Date(m.createdAt),
          deliveredAt: m.deliveredAt ? new Date(m.deliveredAt) : null,
          readAt: m.readAt ? new Date(m.readAt) : null,
        }))
      );
      setIsLoading(false);
    }
  }, [initialMessages]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!threadId) return;

    const supabase = createBrowserClient();

    const subscription = supabase
      .channel(`messages:thread:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "communication_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const newMessage: Message = {
              id: payload.new.id,
              threadId: payload.new.thread_id,
              direction: payload.new.direction,
              type: payload.new.type,
              content: payload.new.content,
              createdAt: new Date(payload.new.created_at),
              deliveredAt: payload.new.delivered_at ? new Date(payload.new.delivered_at) : null,
              readAt: payload.new.read_at ? new Date(payload.new.read_at) : null,
              status: payload.new.status,
            };
            setMessages((prev) => [...prev, newMessage]);
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === payload.new.id
                  ? {
                      id: m.id,
                      threadId: m.threadId,
                      direction: m.direction,
                      type: payload.new.type || m.type,
                      content: payload.new.content || m.content,
                      createdAt: m.createdAt,
                      deliveredAt: payload.new.delivered_at
                        ? new Date(payload.new.delivered_at)
                        : m.deliveredAt,
                      readAt: payload.new.read_at ? new Date(payload.new.read_at) : m.readAt,
                      status: payload.new.status || m.status,
                    }
                  : m
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [threadId]);

  return { messages, isLoading, error };
}
