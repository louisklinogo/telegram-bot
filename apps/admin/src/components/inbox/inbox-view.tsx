"use client";

import { mockInboxMessages } from "@/lib/inbox/mock-data";
import type { InboxMessage } from "@/types/inbox";
import { useState } from "react";
import { InboxDetails } from "./inbox-details";
import { InboxHeader } from "./inbox-header";
import { InboxItem } from "./inbox-item";
import { ScrollArea } from "@/components/ui/scroll-area";

export function InboxView() {
  const [messages] = useState<InboxMessage[]>(mockInboxMessages);
  const [selectedId, setSelectedId] = useState<string | null>(messages[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"all" | "whatsapp" | "instagram">("all");

  const selectedMessage = messages.find((m) => m.id === selectedId) || null;

  // Filter messages
  const filteredMessages = messages.filter((message) => {
    const matchesSearch =
      searchQuery === "" ||
      message.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPlatform =
      platformFilter === "all" || message.platform === platformFilter;

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

      <div className="flex flex-1 overflow-hidden">
        {/* Message List */}
        <div className="w-[400px] border-r">
          <ScrollArea className="h-full">
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
            </div>
          </ScrollArea>
        </div>

        {/* Conversation Details */}
        <div className="flex-1">
          <InboxDetails message={selectedMessage} />
        </div>
      </div>
    </div>
  );
}
