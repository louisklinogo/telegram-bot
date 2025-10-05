import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type OutboxInsert = Database["public"]["Tables"]["communication_outbox"]["Insert"];
type ThreadUpdate = Database["public"]["Tables"]["communication_threads"]["Update"];
type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];

export async function enqueueCommunicationOutbox(supabase: SupabaseClient<Database>, row: OutboxInsert) {
  return supabase.from("communication_outbox").insert(row);
}

export async function updateCommunicationThread(
  supabase: SupabaseClient<Database>,
  id: string,
  teamId: string,
  patch: ThreadUpdate,
) {
  return supabase
    .from("communication_threads")
    .update(patch)
    .eq("id", id)
    .eq("team_id", teamId);
}

export async function createClientBasic(supabase: SupabaseClient<Database>, row: ClientInsert) {
  return supabase.from("clients").insert(row).select("id").single();
}
