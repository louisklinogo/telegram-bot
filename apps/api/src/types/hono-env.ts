import type { ApiKey } from "@Faworra/auth/api-keys";
import type { Database } from "@Faworra/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type baseLogger from "../lib/logger";

export type AuthSession = {
  userId: string;
  teamId: string;
  user: {
    id: string;
    email?: string;
    fullName?: string;
  };
  type: "jwt" | "api_key";
  scopes?: string[];
  apiKey?: ApiKey;
};

export type ApiEnv = {
  Variables: {
    userId: string;
    teamId: string;
    supabaseAdmin: SupabaseClient<Database>;
    session: AuthSession;
    apiKeyUsageStart: number;
    apiKeyId: string;
    logger: typeof baseLogger;
  };
};
