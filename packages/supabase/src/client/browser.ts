import type { Database } from "@Faworra/supabase/types";
import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client for use in Client Components
 * Uses @supabase/ssr for proper SSR compatibility
 */
export function createBrowserClient() {
  return createSSRBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Singleton browser client (use sparingly, prefer creating new clients in components)
 */
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient();
  }
  return browserClient;
}
