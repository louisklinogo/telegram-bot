"use client";

import { PanelRightClose, PanelRightOpen, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { InboxMessage } from "@/types/inbox";
import { CustomerSidebar } from "./customer-sidebar";
import { InboxDetails } from "./inbox-details";
import { InboxItem } from "./inbox-item";

type InboxViewProps = {
  initialThreads?: any[];
};

export function InboxView({ initialThreads = [] }: InboxViewProps) {
  const [status, setStatus] = useState<"open" | "pending" | "resolved" | "snoozed">("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"all" | "whatsapp" | "instagram">("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Use tRPC's suspense infinite query directly to avoid proxy method mismatches
  const [pages, { fetchNextPage, hasNextPage, isFetchingNextPage }] =
    trpc.communications.threadsByStatus.useSuspenseInfiniteQuery(
      { status, limit: 50 },
      {
        getNextPageParam: (lastPage) => lastPage?.nextCursor ?? null,
        // TanStack v5 shape for initialData
        initialData:
          initialThreads.length > 0
            ? {
                pages: [{ status, items: initialThreads, nextCursor: null }],
                pageParams: [null],
              }
            : undefined,
        // Provide initial cursor for the first page
        initialCursor: null,
      }
    );

  const rawThreads = useMemo(
    () => (pages?.pages || []).flatMap((p: any) => p?.items || []),
    [pages]
  );

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
        status: t.status || "new",
        threadStatus: t.status || "open",
        hasAttachment: false,
        messages: [],
        leadId: t.lead?.id ?? null,
        leadStatus: t.lead?.status ?? undefined,
        leadScore: typeof t.lead?.score === "number" ? t.lead.score : undefined,
        leadQualification: t.lead?.qualification ?? undefined,
      } as InboxMessage;
    });
    if (!selectedId && mapped[0]?.id) setSelectedId(mapped[0].id);
    return mapped;
  }, [rawThreads, selectedId]);

  const selectedMessage = useMemo(
    () => items.find((m) => m.id === selectedId) || null,
    [items, selectedId]
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

  // Keyboard navigation
  useHotkeys(
    "up",
    (event) => {
      event.preventDefault();
      const currentIndex = filteredMessages.findIndex((item) => item.id === selectedId);
      if (currentIndex > 0) {
        setSelectedId(filteredMessages[currentIndex - 1].id);
      }
    },
    {
      enableOnFormTags: false,
    },
    [filteredMessages, selectedId]
  );

  useHotkeys(
    "down",
    (event) => {
      event.preventDefault();
      const currentIndex = filteredMessages.findIndex((item) => item.id === selectedId);
      if (currentIndex < filteredMessages.length - 1) {
        setSelectedId(filteredMessages[currentIndex + 1].id);
      }
    },
    {
      enableOnFormTags: false,
    },
    [filteredMessages, selectedId]
  );

  useHotkeys(
    "esc",
    () => {
      setSelectedId(null);
    },
    {
      enableOnFormTags: true,
    },
    []
  );

  // Toggle sidebar with keyboard
  useHotkeys(
    "ctrl+b,cmd+b",
    (event) => {
      event.preventDefault();
      setIsSidebarOpen((prev) => !prev);
    },
    {
      enableOnFormTags: false,
    },
    []
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Conversation List - Left Column */}
        <div
          className={cn(
            "flex w-full flex-shrink-0 flex-col border-r md:w-[380px]",
            selectedId && "hidden md:flex"
          )}
        >
          {/* v0-style left header */}
          <div className="space-y-3 border-b p-4">
            <h2 className="font-semibold text-lg">Inbox</h2>
            <div className="relative">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                value={searchQuery}
              />
            </div>
            <div className="flex gap-2">
              <Select onValueChange={(v: any) => setStatus(v)} value={status}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="snoozed">Snoozed</SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={(v: any) => setPlatformFilter(v)} value={platformFilter}>
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No conversations found
                </div>
              ) : (
                filteredMessages.map((message) => (
                  <InboxItem
                    isSelected={message.id === selectedId}
                    key={message.id}
                    message={message}
                    onClick={() => setSelectedId(message.id)}
                  />
                ))
              )}
              {hasNextPage && (
                <div className="px-2 pt-2">
                  <Button
                    className="w-full"
                    disabled={!hasNextPage || isFetchingNextPage}
                    onClick={() => fetchNextPage()}
                    variant="ghost"
                  >
                    {isFetchingNextPage ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Conversation Details - Center Column */}
        <div className={cn("flex min-h-0 flex-1 flex-col", !selectedId && "hidden md:flex")}>
          {selectedId ? (
            <>
              {/* Mobile back button */}
              <div className="border-b p-2 md:hidden">
                <Button onClick={() => setSelectedId(null)} size="sm" variant="ghost">
                  ← Back to conversations
                </Button>
              </div>
              <InboxDetails message={selectedMessage} />
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="space-y-2 text-center">
                <p className="font-medium text-lg">No conversation selected</p>
                <p className="text-sm">Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>

        {/* Customer Sidebar - Right Column */}
        {selectedMessage && (
          <>
            {/* Toggle button for desktop */}
            <div className="hidden items-start border-l p-2 md:flex">
              <Button onClick={() => setIsSidebarOpen(!isSidebarOpen)} size="icon" variant="ghost">
                {isSidebarOpen ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Sidebar */}
            {isSidebarOpen && (
              <CustomerSidebar
                isOpen={isSidebarOpen}
                message={selectedMessage}
                onClose={() => setIsSidebarOpen(false)}
              />
            )}

            {/* Mobile sidebar toggle button */}
            <div className="fixed right-4 bottom-4 z-40 md:hidden">
              <Button
                className="rounded-full shadow-lg"
                onClick={() => setIsSidebarOpen(true)}
                size="icon"
              >
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
