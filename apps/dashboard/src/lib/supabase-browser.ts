import { createBrowserClient } from "@Faworra/supabase/client";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "Supabase environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. Admin data fetching will be disabled.",
  );
}

export const supabaseBrowser = url && anonKey ? createBrowserClient() : null;
