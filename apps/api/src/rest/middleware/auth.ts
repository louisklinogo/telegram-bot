import type { MiddlewareHandler } from "hono";
import type { ApiEnv } from "../../types/hono-env";
import { createClient, createAdminClient } from "../../services/supabase";

export const requireAuthTeam: MiddlewareHandler<ApiEnv> = async (c, next) => {
  const authHeader = c.req.header("authorization") || c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined;
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const supabase = createClient();
  const admin = createAdminClient();

  const { data: userRes, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !userRes?.user) return c.json({ error: "Invalid token" }, 401);
  const userId = userRes.user.id;

  const { data: uRow, error: uErr } = await admin
    .from("users")
    .select("current_team_id")
    .eq("id", userId)
    .maybeSingle<{ current_team_id: string | null }>();
  if (uErr) return c.json({ error: uErr.message }, 500);
  const teamId = uRow?.current_team_id || null;
  if (!teamId) return c.json({ error: "No team selected" }, 403);

  c.set("userId", userId);
  c.set("teamId", teamId);
  c.set("supabaseAdmin", admin);
  return next();
};
