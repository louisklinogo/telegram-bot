# Transactions UI Audit (Midday Parity)

Scope
- Compare our Transactions table to Midday’s and list concrete component/hook adoptions with target file edits.

Findings
- Sticky columns and smooth horizontal scroll: adopt hooks similar to Midday’s `use-sticky-columns` and `use-table-scroll`.
- Rich cells: Assigned user, Transaction status, Tag badges, Bank account + logo; reuse our primitives where equivalent.
- Table utilities: ExportBar (CSV export of selected), BottomBar (contextual actions when filters active), column-visibility persistence via cookie/local storage.
- Data flow: keep server-first initialData, switch to infiniteQuery with getNextPageParam; add enrichment polling (3s) for incomplete items.
- Shortcuts/UX: keyboard navigation (↑/↓, space/enter), copy share URL.

Targets (edits)
- apps/dashboard/src/app/(dashboard)/transactions/_components/transactions-columns.tsx
  - Add richer cells (status pill, tags, assigned, bank account logo) and actions (copy URL, complete/uncomplete, exclude).
- apps/dashboard/src/app/(dashboard)/transactions/_components/transactions-view.tsx
  - Add export selected, bottom bar, keyboard nav, copy URL, enrichment polling, column-visibility persistence.

References (Midday)
- midday/apps/dashboard/src/components/tables/transactions/{data-table.tsx,columns.tsx,export-bar.tsx,bottom-bar.tsx}
- midday/apps/dashboard/src/hooks/use-sticky-columns.ts

Acceptance
- Visual/behavioral parity for Transactions per plan.md; no API/schema changes; initialData preserved.
