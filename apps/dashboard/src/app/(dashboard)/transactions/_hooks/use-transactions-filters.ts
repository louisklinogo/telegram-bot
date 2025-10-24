"use client";

import { useMemo } from "react";
import { parseAsArrayOf, parseAsBoolean, parseAsInteger, parseAsString, useQueryState, useQueryStates } from "nuqs";

type FilterType = "all" | "payment" | "expense" | "refund" | "adjustment";

type EnrichedListInput = {
  type?: "payment" | "expense" | "refund" | "adjustment";
  status?: ("pending" | "completed" | "failed" | "cancelled")[];
  categories?: string[];
  tags?: string[];
  assignedId?: string;
  assignees?: string[];
  isRecurring?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
  hasAttachments?: boolean;
  accounts?: string[];
  amountMin?: number;
  amountMax?: number;
  includeTags?: boolean;
  limit?: number;
  cursor?: { date: string | null; id: string } | null;
};

/**
 * Custom hook for managing transaction filters
 * Handles URL state, filter transformations, and active filter detection
 */
export function useTransactionsFilters(columnVisibility?: Record<string, boolean>) {
  const [q] = useQueryState("q", { defaultValue: "" });
  const [filters, setFilters] = useQueryStates(
    {
      type: parseAsString,
      statuses: parseAsArrayOf(parseAsString),
      categories: parseAsArrayOf(parseAsString),
      tags: parseAsArrayOf(parseAsString),
      accounts: parseAsArrayOf(parseAsString),
      assignees: parseAsArrayOf(parseAsString),
      start: parseAsString,
      end: parseAsString,
      amount_range: parseAsArrayOf(parseAsInteger),
      attachments: parseAsString,
      recurring: parseAsBoolean,
    },
    { shallow: true },
  );

  // Parse filter values
  const rawType = (filters.type as string | undefined) ?? undefined;
  const allowedTypes = new Set<FilterType>(["payment", "expense", "refund", "adjustment"]);
  const filterType: FilterType = rawType && allowedTypes.has(rawType as FilterType)
    ? (rawType as FilterType)
    : "all";
  
  const statuses: string[] = filters.statuses ?? [];
  const categories: string[] = filters.categories ?? [];
  const tags: string[] = filters.tags ?? [];
  const accounts: string[] = filters.accounts ?? [];
  const assignees: string[] = filters.assignees ?? [];
  const startDate: string = filters.start ?? "";
  const endDate: string = filters.end ?? "";
  const amountRange: number[] | undefined = filters.amount_range ?? undefined;
  const amountMin: number | undefined = amountRange?.[0] ?? undefined;
  const amountMax: number | undefined = amountRange?.[1] ?? undefined;
  const hasAttachments: "any" | "with" | "without" = filters.attachments
    ? filters.attachments === "include"
      ? "with"
      : "without"
    : "any";
  const isRecurring: boolean | undefined = filters.recurring ?? undefined;

  // Build enriched input for API
  const enrichedInput = useMemo<EnrichedListInput>(() => {
    const sort = (arr?: string[]) => (Array.isArray(arr) ? [...arr].sort() : undefined);
    const statusesSorted = sort(statuses);
    const categoriesSorted = sort(categories);
    const tagsSorted = sort(tags);
    const accountsSorted = sort(accounts);
    const assigneesSorted = sort(assignees);
    const includeTags = columnVisibility?.tags !== false;
    
    const input: EnrichedListInput = {
      type: filterType === "all" ? undefined : filterType,
      status: statusesSorted && statusesSorted.length ? (statusesSorted as EnrichedListInput["status"]) : undefined,
      categories: categoriesSorted && categoriesSorted.length ? categoriesSorted : undefined,
      tags: tagsSorted && tagsSorted.length ? tagsSorted : undefined,
      accounts: accountsSorted && accountsSorted.length ? accountsSorted : undefined,
      assignees: assigneesSorted && assigneesSorted.length ? assigneesSorted : undefined,
      isRecurring: isRecurring,
      search: q || undefined,
      startDate: startDate ? `${startDate}T00:00:00.000Z` : undefined,
      endDate: endDate ? `${endDate}T23:59:59.000Z` : undefined,
      hasAttachments: hasAttachments === "any" ? undefined : hasAttachments === "with",
      amountMin: amountMin != null ? Number(amountMin) : undefined,
      amountMax: amountMax != null ? Number(amountMax) : undefined,
      includeTags,
      limit: 50,
    };

    // Remove undefined values
    const cleaned = Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined),
    ) as EnrichedListInput;

    return cleaned;
  }, [
    filterType,
    statuses,
    categories,
    tags,
    accounts,
    assignees,
    isRecurring,
    q,
    startDate,
    endDate,
    hasAttachments,
    amountMin,
    amountMax,
    columnVisibility,
  ]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filterType !== "all" ||
      Boolean(q) ||
      statuses.length > 0 ||
      categories.length > 0 ||
      tags.length > 0 ||
      accounts.length > 0 ||
      assignees.length > 0 ||
      isRecurring != null ||
      hasAttachments !== "any" ||
      amountMin != null ||
      amountMax != null ||
      Boolean(startDate) ||
      Boolean(endDate)
    );
  }, [
    filterType,
    q,
    statuses,
    categories,
    tags,
    accounts,
    assignees,
    isRecurring,
    hasAttachments,
    amountMin,
    amountMax,
    startDate,
    endDate,
  ]);

  const clearAllFilters = () => {
    setFilters({
      type: null,
      statuses: null,
      categories: null,
      tags: null,
      accounts: null,
      assignees: null,
      start: null,
      end: null,
      amount_range: null,
      attachments: null,
      recurring: null,
    });
  };

  const applyParsedFilters = (p: Record<string, unknown>) => {
    if (!p || typeof p !== "object") return;
    setFilters({
      type: (p.type as string | null) ?? null,
      statuses: (p.statuses as string[] | null) ?? (p.status as string[] | null) ?? null,
      categories: (p.categories as string[] | null) ?? null,
      tags: (p.tags as string[] | null) ?? null,
      accounts: (p.accounts as string[] | null) ?? null,
      assignees: (p.assignees as string[] | null) ?? null,
      recurring: typeof p.isRecurring === "boolean" ? p.isRecurring : null,
      attachments:
        p.hasAttachments === undefined ? null : p.hasAttachments ? "include" : "exclude",
      amount_range:
        p.amountMin != null || p.amountMax != null
          ? [p.amountMin as number ?? 0, p.amountMax as number ?? 500000]
          : null,
      start: p.startDate
        ? new Date(p.startDate as string).toISOString().slice(0, 10)
        : null,
      end: p.endDate ? new Date(p.endDate as string).toISOString().slice(0, 10) : null,
    });
  };

  return {
    // Raw filter values
    filterType,
    statuses,
    categories,
    tags,
    accounts,
    assignees,
    startDate,
    endDate,
    amountMin,
    amountMax,
    hasAttachments,
    isRecurring,
    // Computed values
    enrichedInput,
    hasActiveFilters,
    // Actions
    setFilters,
    clearAllFilters,
    applyParsedFilters,
  };
}