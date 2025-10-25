import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type InviteInsert = Database["public"]["Tables"]["user_invites"]["Insert"];

export async function createUserInvite(supabase: SupabaseClient<Database>, invite: InviteInsert) {
  return supabase.from("user_invites").insert(invite);
}
