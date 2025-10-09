import { createServerClient as createSSRClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@cimantikos/supabase/types";

type CreateClientOptions = {
  admin?: boolean;
};

export async function createServerClient(options?: CreateClientOptions) {
  const { admin = false } = options ?? {};
  const cookieStore = await cookies();

  const key = admin
    ? process.env.SUPABASE_SERVICE_ROLE_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const auth = admin
    ? {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      }
    : {};

  return createSSRClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
    auth,
  });
}

// Suppress noisy Supabase warnings about getSession authenticity in server logs
// We use middleware cookie refresh and tRPC token validation; this message is expected
const IGNORE_WARNINGS = ["Using the user object as returned from supabase.auth.getSession()"];
const originalWarn = console.warn;
const originalLog = console.log;
console.warn = (...args: any[]) => {
  const match = args.find((arg) =>
    typeof arg === "string" ? IGNORE_WARNINGS.some((w) => arg.includes(w)) : false,
  );
  if (!match) originalWarn(...args);
};
console.log = (...args: any[]) => {
  const match = args.find((arg) =>
    typeof arg === "string" ? IGNORE_WARNINGS.some((w) => arg.includes(w)) : false,
  );
  if (!match) originalLog(...args);
};
