"use client";

import { useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import type { InboxMessage } from "@/types/inbox";
import { InboxDetails } from "./inbox-details";
import { InboxItem } from "./inbox-item";
import { CustomerSidebar } from "./customer-sidebar";
import { cn } from "@/lib/utils";
import { PanelRightClose, PanelRightOpen, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [
    pages,
    { fetchNextPage, hasNextPage, isFetchingNextPage },
  ] = trpc.communications.threadsByStatus.useSuspenseInfiniteQuery(
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
    },
  );

  const rawThreads = useMemo(
    () => (pages?.pages || []).flatMap((p: any) => p?.items || []),
    [pages],
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
        leadScore: typeof t.lead?.score === 'number' ? t.lead.score : undefined,
        leadQualification: t.lead?.qualification ?? undefined,
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

  // Keyboard navigation
  useHotkeys("up", (event) => {
    event.preventDefault();
    const currentIndex = filteredMessages.findIndex((item) => item.id === selectedId);
    if (currentIndex > 0) {
      setSelectedId(filteredMessages[currentIndex - 1].id);
    }
  }, {
    enableOnFormTags: false,
  }, [filteredMessages, selectedId]);

  useHotkeys("down", (event) => {
    event.preventDefault();
    const currentIndex = filteredMessages.findIndex((item) => item.id === selectedId);
    if (currentIndex < filteredMessages.length - 1) {
      setSelectedId(filteredMessages[currentIndex + 1].id);
    }
  }, {
    enableOnFormTags: false,
  }, [filteredMessages, selectedId]);

  useHotkeys("esc", () => {
    setSelectedId(null);
  }, {
    enableOnFormTags: true,
  }, []);

  // Toggle sidebar with keyboard
  useHotkeys("ctrl+b,cmd+b", (event) => {
    event.preventDefault();
    setIsSidebarOpen((prev) => !prev);
  }, {
    enableOnFormTags: false,
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Conversation List - Left Column */}
        <div className={cn(
          "w-full md:w-[380px] border-r flex-shrink-0 flex flex-col",
          selectedId && "hidden md:flex"
        )}>
          {/* v0-style left header */}
          <div className="p-4 border-b space-y-3">
            <h2 className="text-lg font-semibold">Inbox</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="snoozed">Snoozed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={platformFilter} onValueChange={(v: any) => setPlatformFilter(v)}>
                <SelectTrigger className="w-[160px] h-9">
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
            <div className="p-2 space-y-1">
              {filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No conversations found
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
                <div className="pt-2 px-2">
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => fetchNextPage()}
                    disabled={!hasNextPage || isFetchingNextPage}
                  >
                    {isFetchingNextPage ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Conversation Details - Center Column */}
        <div className={cn(
          "flex-1 min-h-0 flex flex-col",
          !selectedId && "hidden md:flex"
        )}>
          {selectedId ? (
            <>
              {/* Mobile back button */}
              <div className="md:hidden border-b p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedId(null)}
                >
                  ← Back to conversations
                </Button>
              </div>
              <InboxDetails message={selectedMessage} />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">No conversation selected</p>
                <p className="text-sm">Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>

        {/* Customer Sidebar - Right Column */}
        {selectedMessage && (
          <>
            {/* Toggle button for desktop */}
            <div className="hidden md:flex items-start p-2 border-l">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
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
                message={selectedMessage}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
              />
            )}

            {/* Mobile sidebar toggle button */}
            <div className="md:hidden fixed bottom-4 right-4 z-40">
              <Button
                size="icon"
                className="rounded-full shadow-lg"
                onClick={() => setIsSidebarOpen(true)}
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