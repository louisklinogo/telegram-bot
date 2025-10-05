"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc/client";
import type { InboxMessage } from "@/types/inbox";
import { InboxDetails } from "./inbox-details";
import { InboxHeader } from "./inbox-header";
import { InboxItem } from "./inbox-item";

type InboxViewProps = {
  initialThreads?: any[];
};

export function InboxView({ initialThreads = [] }: InboxViewProps) {
  const [status] = useState<"open" | "pending" | "resolved" | "snoozed">("open");
  // ✅ CORRECT: Use initialData from server for infinite query
  const [pages, { fetchNextPage, hasNextPage, isFetchingNextPage }] = trpc.communications.threadsByStatus.useSuspenseInfiniteQuery(
    { status, limit: 50 },
    {
      getNextPageParam: (lastPage) => lastPage?.nextCursor ?? null,
      initialData: initialThreads.length > 0
        ? {
            pages: [{ status, items: initialThreads, nextCursor: null }],
            pageParams: [null],
          }
        : undefined,
    }
  );
  const rawThreads = useMemo(
    () => (pages?.pages || []).flatMap((p: any) => p?.items || []),
    [pages],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"all" | "whatsapp" | "instagram">("all");

  const items: InboxMessage[] = useMemo(() => {
    const mapped: InboxMessage[] = (rawThreads || []).map((t: any) => {
      const platform = t.account?.provider?.startsWith("whatsapp") ? "whatsapp" : "instagram";
      return {
        id: t.id,
        platform,
        customerId: t.contact?.id || undefined,
        customerName: t.contact?.name || t.externalContactId,
        phoneNumber: t.contact?.whatsapp || t.externalContactId,
        instagramHandle: undefined,
        lastMessage: "",
        lastMessageTime: t.lastMessageAt ? new Date(t.lastMessageAt) : new Date(),
        unreadCount: 0,
        status: "new",
        hasAttachment: false,
        messages: [],
      } as InboxMessage;
    });
    if (!selectedId && mapped[0]?.id) setSelectedId(mapped[0].id);
    return mapped;
  }, [rawThreads, selectedId]);

  const selectedMessage = useMemo(
    () => items.find((m) => m.id === selectedId) || null,
    [items, selectedId],
  );

  // Filter messages
  const filteredMessages = items.filter((message) => {
    const matchesSearch =
      searchQuery === "" ||
      message.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPlatform = platformFilter === "all" || message.platform === platformFilter;

    return matchesSearch && matchesPlatform;
  });

  return (
    <div className="flex flex-col h-full">
      <InboxHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        platformFilter={platformFilter}
        onPlatformFilterChange={setPlatformFilter}
      />

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Message List */}
        <div className="w-[400px] border-r">
          <div className="h-full overflow-y-auto">
            <div className="p-2 space-y-2">
              {filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No messages found
                </div>
              ) : (
                filteredMessages.map((message) => (
                  <InboxItem
                    key={message.id}
                    message={message}
                    isSelected={message.id === selectedId}
                    onClick={() => setSelectedId(message.id)}
                  />
                ))
              )}
              {hasNextPage && (
                <div className="pt-2">
                  <button
                    className="w-full text-sm text-primary underline disabled:opacity-50"
                    onClick={() => fetchNextPage()}
                    disabled={!hasNextPage || isFetchingNextPage}
                  >
                    {isFetchingNextPage ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Conversation Details */}
        <div className="flex-1 min-h-0">
          <InboxDetails message={selectedMessage} />
        </div>
      </div>
    </div>
  );
}
