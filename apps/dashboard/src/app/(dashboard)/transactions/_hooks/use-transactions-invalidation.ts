"use client";

import { useCallback } from "react";
import { trpc } from "@/lib/trpc/client";

/**
 * Shared hook for invalidating all transaction-related queries
 * Prevents duplicate invalidation logic across mutations
 */
export function useTransactionsInvalidation() {
  const utils = trpc.useUtils();

  return useCallback(async () => {
    await Promise.all([
      utils.transactions.enrichedList.invalidate(),
      utils.transactions.list.invalidate(),
      utils.transactions.stats.invalidate(),
      utils.transactions.spending.invalidate(),
      utils.transactions.recentLite.invalidate(),
    ]);
  }, [utils]);
}
