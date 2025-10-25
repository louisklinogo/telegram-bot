## Performance: Categories page (/transactions/categories)

- [ ] Run prod trace to remove dev-mode TTFB noise:
  - Commands: `bun run build:dashboard && cd apps/dashboard && bun run start`, then re-trace the page.
- [ ] If TTFB > 600ms or LCP > 2.5s, add short-lived server cache:
  - 60s per-team cache around `getTransactionCategories` in tRPC; key by `teamId + filters`; invalidate on create/update/delete.
- [ ] Ensure client uses initialData pattern:
  - Disable `refetchOnMount`, `refetchOnWindowFocus`, `refetchOnReconnect` for the list query.
- [ ] If still slow, profile DB and indexes:
  - `EXPLAIN ANALYZE` the categories query; add/adjust indexes as needed.

## Transactions page: flicker, kebab menu, date filter

- [ ] Identify source of thin top-line flicker: table fetch indicator triggered by enrichment polling (refetch every ~3s up to 60s when first row `enrichmentCompleted === false`). Confirm via Network requests to `/trpc/transactions.enrichedList`.
- [ ] Pause enrichment polling while any menu/sheet/dropdown is open (DropdownMenu, TransactionSheet) to prevent unmount/auto-close of the 3‑dots menu.
- [ ] Validate date filter payload: ensure `startDate`/`endDate` are ISO strings (`YYYY-MM-DDT00:00:00.000Z` / `...T23:59:59.000Z`). Check for 400 (Zod) errors; show error UI on failure to avoid keepPreviousData showing stale rows.
- [ ] Prevent refetch from immediately overriding new filter values: cancel in-flight requests and debounce refetch on filter changes; keep targeted invalidations for kebab actions.
- [ ] Re-test flow: open 3‑dots → View details → change date filter; expect stable menu, no flicker, correct filtered results without redundant refetch loop.

