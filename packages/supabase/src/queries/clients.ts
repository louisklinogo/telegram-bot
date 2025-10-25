import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

export async function getClients(supabase: SupabaseClient<Database>, teamId: string) {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("team_id", teamId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getClientById(
  supabase: SupabaseClient<Database>,
  id: string,
  teamId: string
) {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("team_id", teamId)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  return data;
}

export async function searchClients(
  supabase: SupabaseClient<Database>,
  teamId: string,
  searchTerm: string
) {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("team_id", teamId)
    .is("deleted_at", null)
    .or(
      `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,whatsapp.ilike.%${searchTerm}%`
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
