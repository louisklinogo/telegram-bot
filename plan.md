# Midday UI Adoption Plan

Goal
- Adopt Midday’s proven dashboard UX (tables, bulk actions, sticky columns) in our apps/dashboard while preserving our server‑first initialData pattern and existing API/DB.

Scope (phased)
- Phase 1 — Transactions (primary target)
- Phase 2 — Invoices
- Phase 3 — Vault (documents)
- Phase 4 — Customers
- Phase 5 — Orders
- Phase 6 — Measurements (adapt Tracker pattern)
- Phase 7 — Dashboard widgets
- Optional later: Settings/Accounts polish

Non‑Goals
- No schema changes; no licensing/push decisions in this plan; no rewrite of API.

Architecture guardrails
- Keep server‑first initialData on page load, then use tRPC queries for interactivity.
- Maintain team_id scoping, strict typing, no any, and our error/validation patterns.

Phase 1: Transactions (deliverables)
- Table ergonomics: sticky columns + gradient (Midday pattern), smooth horizontal scroll.
- Column visibility persistence (cookie/local storage), Export selected (CSV), Bottom bar when filters active.
- Rich cells: Assigned user avatar/name, Transaction status pill (fulfilled/pending), Bank account w/ connection logo, Tag badges, income color treatment.
- UX flows: keyboard navigation (↑/↓, space/enter), Copy share URL, “Analyzing” state with 3s polling until enrichment completes.
- Pagination: infinite query with getNextPageParam; keep initialData for first render.

Phase 2: Invoices (deliverables)
- Mirror table ergonomics, column persistence, export, actions menu, and rich cells (status/balance due/customer).

Phase 3: Vault (deliverables)
- Mirror grid/table ergonomics, sticky headers, tag chips, bulk actions bar, and upload zone parity.

Phase 4: Customers (deliverables)
- Mirror table ergonomics, actions, and quick details drawer.

Phase 5: Orders (deliverables)
- Adopt Midday orders table pattern: sticky columns, status chips, actions menu, export/bottom bars.
- Keep initialData on first render, switch to infiniteQuery for paging; wire bulk actions to our mutations.

Phase 6: Measurements (deliverables)
- Midday lacks Measurements; adapt Tracker table infra: sticky headers, selection, bulk actions, export, infiniteQuery.
- Add day/week/month views with keyboard navigation; preserve initialData; keep domain-specific fields.

Phase 7: Dashboard (deliverables)
- Port card widgets patterns (spending, invoices, vault/inbox summaries) with server-first prefetch and light client hydration.
- Consistent skeletons, card sizes, and quick actions; avoid double-fetching.

Execution steps (per phase)
1) Read‑only audit (Droid Exec, --auto low): generate a concise diff of components/hooks to port and target files to edit; write audit artifact.
2) Implementation (Droid Exec, --auto medium): refactor UI, add hooks/components, wire actions; run `bun run typecheck && bun run lint`; emit change summary; do not commit.
3) Review & commit (manual approval): inspect git diff, then commit with conventional message.

Acceptance criteria (Transactions)
- Visual/behavioral parity: sticky select/date columns, tags, status/assigned cells, export bar, bottom bar on filters, keyboard nav, copy URL, enrichment polling.
- No regressions in typecheck/lint; no schema or API changes; initial load continues to use initialData.

Risks & mitigations
- Licensing: avoid direct copy; re‑implement patterns or use our existing primitives. If we must import code, confirm license/commercial terms first.
- Drift: keep a small shim layer so future Midday parity changes are localized.

Estimated effort
- Phase 1: 4–6 hours
- Phases 2–4: ~3–5 hours each
- Phases 5–7: ~3–5 hours each

Next actions
- Run read‑only audit for Transactions; on approval, proceed to implementation.

