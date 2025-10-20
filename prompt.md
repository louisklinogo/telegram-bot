You are Droid, continuing a styling refactor in a Next.js 15 + Tailwind 3 monorepo.

Objective
- Finish PR1 of the v0‑brillance UI adoption: replace hard‑coded colors with tokens, ensure components use design tokens, and adopt chart color tokens. Do NOT change app architecture.

Ground rules
- Tech: Next 15, Tailwind 3 (no Tailwind 4 features like @custom-variant/@theme inline).
- Fonts: Admin uses Geist Sans for all headings/body. Instrument Serif is ONLY for login/landing (public pages) if needed.
- Sidebar: keep original Admin look (bg-background/border-border/text-foreground). Do not reintroduce v0 sidebar palette.
- Use tokens/classes: bg-background, text-foreground, text-muted-foreground, border-input, border-border, ring-ring, bg-secondary, text-primary, etc. Charts: hsl(var(--chart-n)).

Current state (already done)
- Tokens synced from v0‑brillance (OKLch→HSL) into admin and @Faworra/ui globals; preserved original Admin sidebar tokens.
- Token usage refactors in: Dialog, Sheet, Tooltip, AlertDialog, Alert, Badge, Table, Card, Switch, TimeRangeInput, Sidebar user-menu, Toaster (description/icons).
- Charts: dashboard chart-area uses --chart-1..3 for series; grid uses border token.

Tasks to complete now
1) Replace remaining hard-coded hex colors in Admin components with tokens:
   - apps/admin/src/components/ui/toaster.tsx (base toast classes using bg-[#F6F6F3] → prefer bg-background or bg-secondary + border tokens; ensure dark mode stays readable).
   - apps/admin/src/components/ui/alert.tsx: confirm variants all tokenized (warning updated already).
   - apps/admin/src/components/ui/editor/extentions/bubble-menu/link-item.tsx (#878787 placeholders → text-muted-foreground).
   - apps/admin/src/components/inbox/*: instagram-modal.tsx, whatsapp-modal.tsx, channel-details-sheet.tsx, inbox-get-started.tsx (#878787 → text-muted-foreground, borders → border-input/border).
   - apps/admin/src/components/filter-list.tsx, client-sheet.tsx, measurement-sheet.tsx labels (#878787 → text-muted-foreground).
2) Charts palette: search for any other chart usage and switch series to --chart-n; keep axes/tooltip text using muted/foreground tokens.
3) Visual QA: Light/dark, pages (Login, Dashboard, Clients, Orders, Invoices, Measurements, Transactions, Vault, Settings); check focus rings and contrast.

Acceptance criteria
- No raw hex color classes in Admin components (except SVG icon fills when necessary); use tokenized classes.
- Charts use --chart-n variables for series.
- Sidebar retains original look; headings remain Geist Sans.
- Typecheck and lint pass.

Helpful paths
- Tokens: apps/dashboard/src/app/globals.css, packages/ui/src/globals.css
- Refactored comps: apps/dashboard/src/components/ui/{dialog,sheet,tooltip,alert-dialog,alert,badge,table,card,switch,time-range-input,toast,toaster}.tsx
- Sidebar: apps/dashboard/src/components/sidebar/{sidebar,user-menu}.tsx
- Charts: apps/dashboard/src/components/dashboard/chart-area.tsx

Commands
- Dev: bun run dev (or bun run dev:admin)
- Typecheck/Lint: bun run typecheck && bun run lint

Note
- If dev fails with "Can't resolve 'cookie'" in middleware, ensure apps/dashboard has cookie dependency (it does) and that middleware only imports edge‑safe modules; clearing .next may help.
