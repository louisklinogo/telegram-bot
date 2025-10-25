"use client";

import { useEffect, useRef, useState } from "react";

type UseKeyboardNavigationProps<T> = {
  items: T[];
  getId: (item: T) => string;
  onSelect: (id: string, checked: boolean) => void;
  selectedIds: Set<string>;
};

/**
 * Custom hook for keyboard navigation in tables
 * Handles arrow keys, space for selection, shift+space for range selection
 */
export function useKeyboardNavigation<T>({
  items,
  getId,
  onSelect,
  selectedIds,
}: UseKeyboardNavigationProps<T>) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const lastAnchorIndex = useRef<number | null>(null);

  // Reset focused index when items change
  useEffect(() => {
    if (items.length === 0) setFocusedIndex(0);
    else if (focusedIndex > items.length - 1) setFocusedIndex(items.length - 1);
  }, [items.length, focusedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!items.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setFocusedIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setFocusedIndex(items.length - 1);
    } else if (e.key === " " && e.shiftKey) {
      e.preventDefault();
      // Range selection
      const anchor = lastAnchorIndex.current ?? focusedIndex;
      const start = Math.min(anchor, focusedIndex);
      const end = Math.max(anchor, focusedIndex);
      const rangeIds = items.slice(start, end + 1).map(getId);

      for (const id of rangeIds) {
        onSelect(id, true);
      }
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      const item = items[focusedIndex];
      if (item) {
        const id = getId(item);
        onSelect(id, !selectedIds.has(id));
        lastAnchorIndex.current = focusedIndex;
      }
    }
  };

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    lastAnchorIndex,
  };
}
