"use client";

import { useEffect, useState } from "react";

export function useResizeObserver(target: React.RefObject<Element>) {
  const [entry, setEntry] = useState<ResizeObserverEntry | null>(null);

  useEffect(() => {
    const el = target.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) setEntry(entries[0]);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return entry;
}
