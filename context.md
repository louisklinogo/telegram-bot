## Context: v0‑brillance UI Adoption (Admin App)

Scope
- Align Admin UI with v0‑brillance design tokens and patterns while staying on Next 15 + Tailwind 3 (no Tailwind 4 features).

Constraints
- Keep server‑first architecture unchanged.
- Admin typography: Geist Sans only. Instrument Serif reserved for login/landing pages.
- Keep original sidebar look (no v0 sidebar palette in Admin for now).

Completed
- PR0 Tokens: Converted v0 OKLch → HSL and synced into tokens.
  - Updated: apps/admin/src/app/globals.css (tokens), packages/ui/src/globals.css (tokens).
  - Sidebar tokens temporarily tried; reverted to original Admin sidebar values.
- PR1 (in progress) Token/typography usage in components:
  - Admin headings remain Geist Sans. Removed accidental serif usage.
  - Replaced hard‑coded hex with token classes in: Dialog, Sheet, Tooltip, AlertDialog, Alert, Badge, Table, Card, Switch, TimeRangeInput, Sidebar user menu, Toaster (custom) description/icons.
  - Charts: apps/admin/src/components/dashboard/chart-area.tsx now uses --chart-1..3 for series; grid uses border token.
  - Sidebar component reverted to original look (bg-background/border-border/text-foreground) per UX decision.
- Utilities/tokens now available: chart-1..5, radius variants, text-balance, etc.

Outstanding Work
1) Finish token sweep (replace remaining hex):
   - apps/admin/src/components/ui: toaster.tsx (base toast background classes), alert.tsx variants confirm, editor/bubble-menu placeholders, any remaining hex in ui/*.
   - apps/admin/src/components/inbox/*: instagram-modal.tsx, whatsapp-modal.tsx, channel-details-sheet.tsx, inbox-get-started.tsx (muted text), etc.
   - apps/admin/src/components/filter-list.tsx, client-sheet.tsx, measurement-sheet.tsx labels.
2) Charts palette: audit other chart uses (if any) and move series to --chart-n.
3) QA pass: light/dark, key pages (Login, Dashboard, Clients, Orders, Invoices, Measurements, Transactions, Vault, Settings), focus rings, contrast.

Decisions
- Fonts: Admin uses Geist Sans for all headings/body; Instrument Serif only for public/login/marketing.
- Sidebar: keep original Admin styling; do not use v0 sidebar palette.

Notes
- A converter script exists: scripts/convert-oklch-to-hsl.ts (uses culori) to regenerate HSL tokens from v0 sources if needed.
- Earlier Edge middleware issue ("Can't resolve 'cookie'") was addressed by adding cookie dependency; if still observed, re‑verify Turbopack picks the dep and that middleware only imports edge‑safe modules.

How to Resume
- Dev: `bun run dev` (or `bun run dev:admin`)
- Typecheck/Lint: `bun run typecheck` / `bun run lint`
- Continue PR1: finish hex → token sweep in the files listed above, then adopt chart tokens wherever charts exist.
- When done, perform visual QA and update plan.md checkboxes.
