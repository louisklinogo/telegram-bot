description: Triage debug.txt, attachments, or logs/* files with focused, production-ready fixes
argument-hint: <file-or-glob|last|notes>
---

You are Droid. Perform a focused debug triage for this repo using the most relevant artifacts, not just debug.txt.

Inputs (priority order):
1) Attached file(s) or an explicit path/glob provided via `$ARGUMENTS` (e.g., `logs/api*.log`, `apps/admin/.next/errors.log`).
2) File: C:/Users/louis/Projects/telegram-bot/debug.txt (if present).
3) Logs under C:/Users/louis/Projects/telegram-bot/logs/**/* (all .log/.txt/.json). If multiple exist, prefer the most recent or the largest non-rotated file; if ambiguous, inspect the top 1–2 candidates.
4) Recent screenshots pasted in chat (if any).
5) Current branch and workspace state.

Argument handling:
- `$ARGUMENTS` may contain a file or glob pattern and/or short notes. If it matches a path/glob, use those files first.
- If `$ARGUMENTS` equals `last`, pick the latest modified file from the logs directory.
- Treat any non-path text in `$ARGUMENTS` as extra context (page, action taken, recent edits).

Triage workflow:
1) Resolve target files per the priority above. Cap analysis to the 1–2 most relevant artifacts.
2) For each target file:
   - If large, scan the tail first (last 400–1200 lines). Extract recent ERROR/WARN/Exception/stack traces.
   - Summarize the error: type, module/service, route/query, parameters, timestamps, and likely layer.
3) Identify the code path from UI → tRPC/REST → DB queries. Point to exact files and lines to inspect.
4) Propose the best production-ready fix. Include:
   - What to change (file + small diff snippet)
   - Why it fixes the root cause (not just masking)
   - Any data shape/serialization concerns (Dates, numeric precision, timezone, JSON serialization)
5) List 1–3 verification steps (typecheck, lint, dev run page, exact action to repro) — strict and minimal.
6) If the error is due to environment (network/auth/keys), state the exact env vars or connectivity checks and stop.

Heuristics & tooling notes:
- Prefer searching logs for: `ERROR|Exception|Unhandled|Traceback|E[A-Z]{3,}|WARN` (case-insensitive). Group by timestamp and stack root.
- When picking from logs/, prefer files with today’s date or the largest non-rotated file. If unclear, sample the last N lines of the top 2 files.
- Be mindful of secrets in logs; redact tokens, keys, and PII in the summary.

Output format:
- Short summary (what failed and where; include service/page if known)
- Root cause hypothesis (1–2 bullets)
- Most efficient fix plan (bullets + tiny code blocks)
- Verification checklist
