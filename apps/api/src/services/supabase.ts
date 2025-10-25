import type { Database } from "@Faworra/supabase/types";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

// Create a Supabase client suitable for the API (Hono) runtime — no Next.js cookies.
// Note: Don't use accessToken option here, pass token to getUser() instead
export function createClient(): SupabaseClient<Database> {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

export function createAdminClient(): SupabaseClient<Database> {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
