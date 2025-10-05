import { validateEnvironmentVariables } from "@cimantikos/config";

let cachedConnectionString: string | undefined;

export function getSupabaseConnectionString(): string {
  if (!cachedConnectionString) {
    const env = validateEnvironmentVariables();
    const connectionString = env.SUPABASE_DB_URL;
    if (!connectionString || connectionString.trim().length === 0) {
      throw new Error("SUPABASE_DB_URL must be set to use PostgreSQL-backed Mastra storage.");
    }
    cachedConnectionString = connectionString;
  }

  return cachedConnectionString!;
}
