# TransactionsSearchFilter — Implementation Plan (AI required, Midday parity)

## Summary
- Build an AI-first TransactionsSearchFilter that mirrors Midday’s UX: top search + Filters sheet (date range, status, attachments, recurring, category, account, assignee, tags, amount range), removable chips, and apply/clear controls.
- Server-first data flow, strict typing, team_id scoping, initialData pattern, and deterministic formatting.

## Branch & Scope
- Branch: `feature/transactions-search-filter`
- Pages touched: `apps/admin/(dashboard)/transactions/*` only; API/DB to support filters; no unrelated refactors.

## Deliverables
- Reusable Client component: `apps/admin/src/app/(dashboard)/transactions/_components/transactions-search-filter.tsx`
- Shared types: `apps/admin/src/app/(dashboard)/transactions/_components/types.ts` (FilterState)
- Admin integration: wire into `transactions-view.tsx` replacing ad‑hoc filter UI; keep column visibility, bulk actions, and chips.
- API: extend `transactions.enrichedList` input schema and query; add `ai.parseTransactionQuery` route.
- DB: query builder and indexes guidance to keep filtering fast.

## UI/UX (Midday parity)
- Top bar: text input + AI field (“Ask AI”) → Parse → preview merged filters → Apply.
- Filters sheet: 
  - Type pills: all/payment/expense/refund/adjustment
  - Date range (UTC bounds): from/to
  - Status[] (pending/completed/failed/cancelled)
  - Attachments: any/with/without
  - Recurring: checkbox
  - Categories[] (lazy tree; MultipleSelector)
  - Accounts[]/Assignees[]/Tags[] (multi)
  - Amount range: min/max (numeric)
- Chips: reflect FilterState; removable; “Clear all”.
- Performance: debounce search (300ms), apply-on-close for heavy filters, deterministic date/number formatting.

## Types (strict)
```ts
// apps/admin/.../types.ts
export type FilterState = {
  type?: "payment" | "expense" | "refund" | "adjustment";
  search?: string;
  startDate?: string; // ISO (00:00:00Z)
  endDate?: string;   // ISO (23:59:59Z)
  statuses?: Array<"pending" | "completed" | "failed" | "cancelled">;
  hasAttachments?: boolean; // undefined=any
  isRecurring?: boolean;
  categories?: string[]; // slugs
  accounts?: string[];   // ids
  assignees?: string[];  // ids
  tags?: string[];       // ids
  amountMin?: number;
  amountMax?: number;
  limit?: number; // default 50
};
```

## API (tRPC) changes
- `apps/api/src/trpc/routers/transactions.ts`
  - Extend `enrichedList` Zod input with fields in FilterState; `.returns<T>()` at end; minimal selects.
  - Add `ai.parseTransactionQuery`:
    - Input: `{ query: string }`
    - Output: `FilterState` (validated; never executes DB search).
    - Server-only; logs/traces latency; feature is required but UI remains usable if AI fails (falls back to manual filters with error toast).

## DB/query builder (Drizzle)
- Centralized predicate builder that composes WHERE clauses for each filter; all queries scoped by `team_id`.
- Minimal selects: transaction core fields + joins (category, client, account, assignment) required by table UI.
- Attachments flag: join/count attachments by `transaction_id` or maintain `has_attachments` materialized field (if available) for speed.
- Sorting: `date DESC`, `limit` via input.
- Index guidance (ensure/verify):
  - `transactions(team_id, date)`
  - `transactions(team_id, status)`
  - `transactions(team_id, category_slug)`
  - `transactions(team_id, assigned_id)`
  - `transactions(team_id, account_id)`
  - `transactions(team_id, amount)`
  - `attachments(transaction_id)`
  - `transaction_tags(transaction_id, tag_id)`

## Admin integration
- Replace local filter state in `transactions-view.tsx` with a single `FilterState` produced by `<TransactionsSearchFilter />`.
- Keep initialData: pass server-fetched results; `useQuery` uses `initialData` to avoid refetch-on-mount.
- Debounce search; apply-on-close for heavy filters; chip list reads from FilterState.

## Acceptance criteria
- UI parity with Midday (layout, interactions, chips, apply/clear).
- AI parsing is required path; manual filters always available; invalid AI output handled with Zod and error toast.
- Queries are team-scoped, minimal selects, no N+1; 50 items default; deterministic date formatting; no hydration errors.
- Typecheck and lint pass.

## Risks & mitigations
- Query slowness → ensure indexes, limit, and minimal selects; consider precomputed `has_attachments` if join is hot.
- AI mis-parse → strict Zod validation and preview-before-apply diff.
- Drift between Admin/API/DB → single `FilterState` + shared Zod schema shapes; centralized predicate builder.

## Rollout & metrics
- Behind route-level feature flag only during development branch; not user-visible until merged.
- Track parse latency and error rate; monitor enrichedList query time and rows scanned.

## Next steps
1) Create branch `feature/transactions-search-filter`.
2) Scaffold component and types; render-only with mock state.
3) Extend tRPC `enrichedList` input schema; wire to existing query builder (no behavior change yet).
4) Implement predicate builder additions and minimal selects; verify team_id filters.
5) Add `ai.parseTransactionQuery` route with Zod validation and prompt; UI “Ask AI” → preview → apply.
6) Integrate component into `transactions-view.tsx`; remove ad‑hoc filter UI.
7) Deterministic date/number formatting; debounce and apply-on-close behavior.
8) Typecheck/lint; manual QA; commit.
9) Open PR with performance notes and parity checklist.
