import { getEnvConfig, validateEnvironmentVariables } from "@Faworra/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseInstance = SupabaseClient<any, any, any>;

let serviceClient: SupabaseInstance | null = null;
let anonClient: SupabaseInstance | null = null;

const ensureEnv = () => {
  if (!serviceClient && !anonClient) {
    validateEnvironmentVariables();
  }
  return getEnvConfig();
};

const createSupabaseClient = (url: string, key: string): SupabaseInstance =>
  createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

export const getSupabaseServiceClient = (): SupabaseInstance => {
  if (!serviceClient) {
    const env = ensureEnv();
    serviceClient = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  return serviceClient;
};

export const getSupabaseAnonClient = (): SupabaseInstance | null => {
  const env = ensureEnv();

  if (!env.SUPABASE_ANON_KEY) {
    return null;
  }

  if (!anonClient) {
    anonClient = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  }

  return anonClient;
};

export type { SupabaseInstance as SupabaseClient };
