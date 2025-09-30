"use client";

import { InboxGetStarted } from "@/components/inbox/inbox-get-started";
import { InboxView } from "@/components/inbox/inbox-view";
import { mockInboxMessages } from "@/lib/inbox/mock-data";

export default function InboxPage() {
  // Check if we have any messages (in production, this would check if accounts are connected)
  const hasMessages = mockInboxMessages.length > 0;
  const isConnected = false; // Set to false to see the get started screen

  if (!isConnected || !hasMessages) {
    return <InboxGetStarted />;
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <InboxView />
    </div>
  );
}
