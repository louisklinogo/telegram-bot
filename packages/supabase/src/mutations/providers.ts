import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type TeamInsert = Database["public"]["Tables"]["teams"]["Insert"];
type AccountInsert = Database["public"]["Tables"]["communication_accounts"]["Insert"];

export async function ensureAnyTeam(
  supabase: SupabaseClient<Database>
): Promise<{ id: string } | null> {
  const { data: teamRow, error: teamErr } = await supabase
    .from("teams")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (teamErr) return null;
  if (teamRow?.id) return teamRow;
  const { data: created, error: createErr } = await supabase
    .from("teams")
    .insert({ name: "Default Team" })
    .select("id")
    .single();
  if (createErr) return null;
  return created as { id: string };
}

export async function upsertCommunicationAccount(
  supabase: SupabaseClient<Database>,
  row: AccountInsert
) {
  return supabase
    .from("communication_accounts")
    .upsert(row, { onConflict: "team_id,provider,external_id" })
    .select("id, provider, external_id, display_name, status")
    .single();
}
