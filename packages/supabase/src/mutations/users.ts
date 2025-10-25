import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type UserInsert = Database["public"]["Tables"]["users"]["Insert"];

export async function upsertUserBasic(supabase: SupabaseClient<Database>, user: UserInsert) {
  return supabase.from("users").upsert(user, { onConflict: "id" });
}
