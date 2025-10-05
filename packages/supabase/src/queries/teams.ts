import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

export async function getTeamById(supabase: SupabaseClient<Database>, teamId: string) {
  const { data, error } = await supabase.from("teams").select("*").eq("id", teamId).single();

  if (error) throw error;
  return data;
}

export async function getUserTeams(supabase: SupabaseClient<Database>, userId: string) {
  // This would join with users_on_team when that table is properly set up
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
