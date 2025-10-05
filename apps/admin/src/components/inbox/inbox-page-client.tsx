"use client";

import { useState } from "react";
import { InboxLiveList } from "@/components/inbox/inbox-live-list";
import { ManageWhatsApp } from "@/components/inbox/manage-whatsapp";
import { ThreadView } from "@/components/inbox/thread-view";

type Thread = { id: string; external_contact_id: string; last_message_at: string | null };

export function InboxPageClient({ items }: { items: Thread[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(items?.[0]?.id ?? null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <ManageWhatsApp />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-160px)]">
        <div className="md:col-span-1 border rounded p-3 overflow-hidden">
          <InboxLiveList items={items} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="md:col-span-2 border rounded p-3 overflow-hidden">
          <ThreadView threadId={selectedId} />
        </div>
      </div>
    </div>
  );
}
