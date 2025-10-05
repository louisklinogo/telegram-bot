import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@cimantikos/supabase/types";

export type ApiEnv = {
  Variables: {
    userId: string;
    teamId: string;
    supabaseAdmin: SupabaseClient<Database>;
  };
};
