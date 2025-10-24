"use client";

import { trpc } from "@/lib/trpc/client";

/**
 * Hook to get the current team's base currency
 * Returns the team's baseCurrency or defaults to "GHS"
 */
export function useTeamCurrency() {
  const { data: team } = trpc.teams.current.useQuery(undefined, {
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  return team?.baseCurrency || "GHS";
}
