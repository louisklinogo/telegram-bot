import "dotenv/config";
/*
  RLS verification script (read-only)
  Usage:
    RLS_VERIFY_TOKEN=<jwt> bun scripts/verify-rls.ts
  Optional:
    RLS_VERIFY_TEAM_ID=<uuid> to skip reading users.current_team_id
*/

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

type TableCheck = {
  name: string;
  select: string; // must include id, team_id when available
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let TOKEN = process.env.RLS_VERIFY_TOKEN || process.argv.find((a) => a.startsWith("--token="))?.split("=")[1];
const TEAM_ID = process.env.RLS_VERIFY_TEAM_ID;

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env.");
    process.exit(1);
  }
  if (!TOKEN) {
    // Try token.txt fallback (dev helper)
    const tokPath = process.env.RLS_VERIFY_TOKEN_FILE || join(process.cwd(), "token.txt");
    try {
      if (existsSync(tokPath)) {
        const raw = readFileSync(tokPath, "utf-8").trim();
        let fromFile: string | null = null;
        // Accept JSON or key:value or bare token
        try {
          const obj = JSON.parse(raw);
          fromFile = (obj as any)?.token || (obj as any)?.access_token || (obj as any)?.currentSession?.access_token || null;
        } catch {
          const m = raw.match(/"token"\s*:\s*"([^"]+)"/);
          fromFile = m?.[1] || (raw.startsWith("eyJ") ? raw : null);
        }
        if (fromFile) {
          TOKEN = fromFile;
          console.log("Using token from token.txt");
        }
      }
    } catch {}
  }

  if (!TOKEN) {
    console.error("Missing RLS_VERIFY_TOKEN. Provide a user access token via env, --token=..., or token.txt file.");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${TOKEN}` },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) {
    console.error("Failed to load user from token:", userErr?.message || "unknown error");
    process.exit(1);
  }

  let teamId = TEAM_ID || "";
  if (!teamId) {
    const { data: u, error } = await supabase
      .from("users")
      .select("current_team_id")
      .eq("id", userRes.user.id)
      .maybeSingle();
    if (error) {
      console.warn("Could not fetch current_team_id from users; set RLS_VERIFY_TEAM_ID to skip.");
    } else {
      teamId = (u as any)?.current_team_id || "";
    }
  }

  if (!teamId) {
    console.warn("No team id detected; continuing without strict equality checks.");
  } else {
    console.log("Using team:", teamId);
  }

  const checks: TableCheck[] = [
    { name: "clients", select: "id, team_id" },
    { name: "orders", select: "id, team_id" },
    { name: "invoices", select: "id, team_id" },
    { name: "measurements", select: "id, team_id" },
    { name: "communication_threads", select: "id, team_id" },
    { name: "communication_messages", select: "id, team_id" },
  ];

  let failures = 0;

  for (const t of checks) {
    const { data, error } = await supabase.from(t.name).select(t.select).limit(5);
    if (error) {
      console.error(`[${t.name}] query failed:`, error.message);
      failures++;
      continue;
    }

    const rows = (data as Array<{ id: string; team_id?: string }>) || [];
    if (!rows.length) {
      console.log(`[${t.name}] OK (no rows visible for user)`);
    } else if (teamId) {
      const bad = rows.filter((r) => r.team_id !== teamId);
      if (bad.length) {
        console.error(`[${t.name}] RLS VIOLATION: found rows from other team ids`, bad);
        failures++;
      } else {
        console.log(`[${t.name}] OK (${rows.length} rows, all match team_id)`);
      }
    } else {
      console.log(`[${t.name}] OK (${rows.length} rows)`);
    }

    // Negative test: try filtering to a random team and expect zero
    const randomTeam = crypto.randomUUID();
    const { data: xdata, error: xerr } = await supabase
      .from(t.name)
      .select("id")
      .eq("team_id", randomTeam)
      .limit(1);
    if (xerr) {
      console.error(`[${t.name}] negative-filter failed:`, xerr.message);
      failures++;
    } else if ((xdata as any[])?.length > 0) {
      console.error(`[${t.name}] RLS VIOLATION: able to fetch rows for another team_id`);
      failures++;
    }
  }

  if (failures > 0) {
    console.error(`RLS verification FAILED with ${failures} issue(s).`);
    process.exit(1);
  }

  console.log("RLS verification PASSED.");
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
