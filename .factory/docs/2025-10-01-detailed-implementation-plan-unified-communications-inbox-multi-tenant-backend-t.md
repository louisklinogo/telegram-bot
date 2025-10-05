## Branching
- Create branch: feat/unified-comms-inbox
- Work in small PRs per phase; rebase on chore/monorepo-stabilization as needed; target base: master

## Repo structure (delta)
- apps/
  - api (Bun + Hono server, /trpc + REST webhooks + health)
  - admin (Next) — add tRPC client/provider and new screens
  - worker (long‑running provider adapters / queues; hosts Baileys connections)
  - telegram-bot (unchanged)
- packages/
  - database (Drizzle ORM schema + migrations + seed)
  - config (env validation incl. comms vars)
  - supabase (server/client creators; storage helpers)
  - logger (pino wrapper)
  - schemas (shared zod types: comms, campaigns, templates)
  - integrations (providers: whatsapp-baileys, whatsapp-twilio, whatsapp-meta, instagram-meta)
  - services (domain services: comms, campaigns, automations, consent)

## Environment/config
- New secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SIGNING_KEY(optional), META_APP_ID, META_APP_SECRET, META_VERIFY_TOKEN, META_WEBHOOK_SECRET, META_APP_ACCESS_TOKEN, BAILLEYS_ENCRYPTION_KEY (for session blobs), QUIET_HOURS_DEFAULT="21:00-08:00"
- Add to packages/config/validateEnv with formats; don’t log secrets; support per-team overrides in DB

## Database (Drizzle) — multi‑tenancy and comms
1) Core multi‑tenant (if not present)
- teams(id, name, baseCurrency, timezone, quietHours, plan)
- users(id, email, fullName, teamId?) and team_memberships(userId, teamId, role owner|manager|agent|custom)
- Backfill: create default team, assign existing data; then set NOT NULL and FKs

2) Scope existing domain
- Add teamId to clients, orders, invoices, measurements (FK teams.id, NOT NULL)
- Per‑team uniques: invoiceNumber, orderNumber; indexes: teamId+createdAt, contact lookups

3) Communications domain (new)
- communication_accounts(teamId, provider, externalId, displayName, status, credentialsEncrypted, rateConfig)
- communication_threads(teamId, accountId, contactId, channel, externalContactId, status open|pending|resolved|snoozed, lastMessageAt)
- communication_messages(teamId, threadId, providerMessageId, direction in|out, type text|image|video|audio|sticker|document, content, meta, sentAt, deliveredAt, readAt, error)
- message_attachments(messageId, storagePath, contentType, size, checksum)
- message_delivery(messageId, status queued|sent|delivered|read|failed, providerErrorCode, retries)
- labels(teamId, name) and thread_labels(threadId, labelId)
- templates(teamId, provider, name, language, body, status draft|submitted|approved|rejected)
- campaigns(teamId, templateId, audienceFilter, scheduleAt, status, stats jsonb)
- automations(teamId, triggers jsonb, actions jsonb, enabled, lastRunAt)

4) Inbox/Vault linkage
- Reuse Supabase Storage bucket "vault"; store under vault/<teamId>/(threads|transactions|inbox)/...
- Link message_attachments and transaction_attachments to same storage

5) Policies (RLS)
- Enforce team membership on all team‑scoped tables (select/insert/update/delete)
- Encrypt credentials at rest; store IV/tag; decrypt only in worker/api with least privilege

## API (apps/api)
- Hono server: /trpc (tRPC), /webhooks/{twilio,meta}/(whatsapp|instagram), /health, /health/db
- tRPC init: superjson; context: { session (Supabase), db, teamId, geo }; public/protected procedures; team guard middleware
- Routers:
  - communications.accounts: connect/list/remove accounts; verify credentials; rotate tokens
  - communications.threads: list/search by status/label/contact; assign/unassign; change status; link to client/order/invoice/transaction
  - communications.messages: list thread messages; send text/media; mark read; fetch delivery status
  - communications.labels: CRUD; apply/remove on threads
  - communications.templates: CRUD; submit to provider when required
  - communications.campaigns: create/schedule/pause/resume; audience preview; delivery stats
  - communications.automations: CRUD; enable/disable; test run
  - core: user/team/customers/invoices/transactions/vault minimal endpoints for linking

## Webhooks (REST)
- Twilio: signature validation; receive inbound & status callbacks; idempotent by MessageSid
- Meta (WhatsApp/IG): hub verification; X‑Hub‑Signature‑256; inbound & delivery/read events; idempotent by message.id
- Store inbound → upsert account/contact → thread → messages/attachments → trigger automations

## Providers (packages/integrations)
- whatsapp-baileys: session store (encrypted), QR lifecycle, reconnect, message recv/send, media upload; runs in apps/worker
- whatsapp-twilio: REST client for send; webhook handlers in api
- whatsapp-meta: Graph API client; templates usage; webhook handlers
- instagram-meta: Graph API client; webhook handlers
- Rate limiting per provider; quiet hours enforcement

## Services (packages/services)
- comms service: thread resolution, contact auto‑link/create, message persistence, media handling, delivery updates
- campaigns service: batching, throttling, retry/backoff; respects quiet hours and provider caps
- automations service: rule evaluation (regex/intent/time), actions (reply/assign/label); integrates Mastra agents for suggested/auto replies
- consent service: per‑channel opt‑in/out tracking; block sends on no‑consent

## Admin (apps/admin)
- Add tRPC client/provider; pages: Accounts (connect/manage), Inbox (list threads, thread view, composer, assignment, labels), Campaigns, Templates, Automations, Settings (quiet hours, roles)
- Linkages: from thread to client/order/invoice/transaction; quick actions

## Worker (apps/worker)
- Runs provider adapters needing sockets/long‑lived sessions (Baileys); job queue for campaigns & automations; uses same database and storage helpers

## Security & compliance
- Secrets in env; encryption key rotation policy; audit log for consent/template/campaign actions; outbound policy checks (24‑h window, template approval)

## Observability
- Health endpoints; structured logs; per‑provider metrics (in/out rate, failures, queue depth); alerting hooks

## Retention
- Messages retained indefinitely; media purged after 180 days via scheduled job; configurable per team

## Testing
- Unit: services and adapters (mocks)
- Integration: webhooks (Twilio/Meta), message flow, quiet hours, rate limiting, consent
- E2E: connect account → receive message → agent reply → delivery updates; campaign dry‑run → scheduled send

## Rollout (incremental PRs)
1) Scaffold apps/api + tRPC + health; base routers; config/env updates
2) DB migrations: teams/users/memberships; teamId on existing tables; backfill script
3) Comms schema tables + RLS
4) Baileys adapter + worker; basic inbound/outbound in threads
5) Webhooks: Twilio + Meta (WhatsApp/IG); delivery tracking
6) Admin screens: Accounts + Inbox (threads/messages)
7) Templates + 24‑h window enforcement
8) Campaigns + rate limits + quiet hours
9) Automations (rules + Mastra agents) with HITL/Autopilot toggle
10) Vault linking + transactions attachments
11) Observability + retention jobs

## Risks & mitigations
- Provider policy changes → abstract adapters; feature flags per provider
- Baileys session instability → auto‑reconnect, persistent sessions, QR recovery flow
- Rate limit/blocked templates → throttling + preflight checks + operator dashboard

## Acceptance criteria
- Multi‑tenant comms (threads/messages) across providers with delivery tracking
- Admin can manage accounts, converse, assign, label; campaigns run respecting limits/quiet hours/consent
- RLS enforced; media retention at 180 days; logs/metrics healthy

Once approved, I will start by creating branch feat/unified-comms-inbox and open PR for Phase 1.