"use client";

import { useEffect, useRef, useState } from "react";

type Thread = { id: string; external_contact_id: string; last_message_at: string | null };

export function InboxLiveList({
  items: initial,
  selectedId,
  onSelect,
}: {
  items: Thread[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const [items, setItems] = useState<Thread[]>(initial || []);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchThreads = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${base}/communications/threads?status=open`, { cache: "no-store" });
      const json = await res.json();
      if (Array.isArray(json?.items)) setItems(json.items);
    } catch {}
  };

  useEffect(() => {
    timerRef.current = setInterval(fetchThreads, 3000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">No conversations yet</div>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((t) => (
        <li
          key={t.id}
          className={`border rounded p-3 cursor-pointer ${selectedId === t.id ? "bg-neutral-50 border-neutral-300" : ""}`}
          onClick={() => onSelect?.(t.id)}
        >
          <div className="font-medium">{t.external_contact_id}</div>
          <div className="text-xs text-neutral-500">{t.last_message_at ?? "—"}</div>
        </li>
      ))}
    </ul>
  );
}
