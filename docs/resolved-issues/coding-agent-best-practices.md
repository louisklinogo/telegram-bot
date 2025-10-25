# Coding Agent – Do's, Don'ts, and Best Practices

Purpose: Prevent repeat mistakes and hold the agent to high standards across tasks. Keep this living doc updated as we work.

## Do's

- Use structured logging with Pino only; never use `console.*`. Attach request context (reqId, userId, teamId) and redact secrets.
- Extract constants for magic numbers (HTTP codes, limits, thresholds). Prefer small `HTTP` map and domain constants (MIN/MAX/DEFAULT).
- Reduce complexity aggressively: extract helpers, use early returns, and an `ensure()` helper for validation + error status.
- Prefer optional chaining over nested guards; use natural variable names that read like reasoning.
- Keep async functions only when using `await`; otherwise remove `async` to satisfy lint.
- Always add block statements `{}` for single-line conditionals; avoid empty catch blocks (add intent comment instead).
- Use Zod for validation with named constants for `.min/.max/.default` values.
- Follow initialData pattern in Dashboard pages; Server Component fetch → pass initialData → Client Component uses tRPC.
- Scope every DB query by `team_id`; enforce through typed auth context.
- Replace ad-hoc strings/status codes with typed enums/constants; centralize repeated parsing utilities.

## Don'ts

- No `console.log/warn/error`; no leaking secrets or tokens in logs.
- No magic numbers inline; no unexplained thresholds; no duplicated status codes.
- No `async` without `await`; no empty blocks; no nested control flow that obscures intent.
- No client prefetches for initial loads; no unscoped DB queries; no `any` types.
- No lingering `biome-ignore` comments without effect; prefer real fixes over suppressions.

## Patterns (Copy/Paste)

```ts
// http.ts
export const HTTP = { OK: 200, BAD_REQUEST: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, INTERNAL_SERVER_ERROR: 500 } as const;

export function ensure(cond: unknown, message: string, status = HTTP.BAD_REQUEST): asserts cond {
  if (!cond) throw new HTTPException(status, { message });
}
```

```ts
// logging.ts
import logger from "../lib/logger";
logger.info({ ms, type, path, queries }, "trpc procedure");
```

```ts
// zod constants
const MIN_LIMIT = 1; const MAX_LIMIT = 100; const DEFAULT_LIMIT = 50;
const schema = z.object({ limit: z.number().min(MIN_LIMIT).max(MAX_LIMIT).default(DEFAULT_LIMIT) });
```

## Ongoing Notes (to update)

- Ultracite migration: prefer auto-fixes; remove ineffective suppressions; embrace braces/blocks; organize imports.
- OAuth router: split handlers into helpers, replace magic numbers, optional chain checks; map error messages to HTTP 400 consistently.
- tRPC init: constants for bearer prefix, reqId radix, slow threshold; use Pino instead of console; keep timing middleware env-gated.
