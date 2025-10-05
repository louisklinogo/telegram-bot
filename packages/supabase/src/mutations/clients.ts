import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

export async function createClient(supabase: SupabaseClient<Database>, client: ClientInsert) {
  const { data, error } = await supabase.from("clients").insert(client).select().single();

  if (error) throw error;
  return data;
}

export async function updateClient(
  supabase: SupabaseClient<Database>,
  id: string,
  teamId: string,
  updates: ClientUpdate,
) {
  const { data, error } = await supabase
    .from("clients")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("team_id", teamId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClient(supabase: SupabaseClient<Database>, id: string, teamId: string) {
  // Soft delete
  const { data, error } = await supabase
    .from("clients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("team_id", teamId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
