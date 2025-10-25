import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { addQueryLog } from "./request-context";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or SUPABASE_DB_URL must be set");
}

// Create postgres connection with better timeout handling
const client = postgres(connectionString, {
  max: 20, // Increased pool size
  idle_timeout: 30, // 30 seconds
  connect_timeout: 60, // 60 seconds connect timeout
  max_lifetime: 60 * 60, // 1 hour max connection lifetime
  prepare: false, // Disable prepared statements to avoid some timeout issues
  transform: {
    undefined: null, // Transform undefined to null for Postgres
  },
  onnotice: () => {}, // Suppress notices
  debug:
    process.env.DB_DEBUG === "1"
      ? (conn, q) => {
          try {
            const text = Array.isArray(q) ? q.join(" ") : String(q ?? "");
            // Log query text only; durations captured at procedure level
            console.debug(`[db][debug] ${text.slice(0, 500)}`);
            addQueryLog({ sql: text, ms: 0 });
          } catch {}
        }
      : false,
});

// Create drizzle instance with schema and a before/after query hook
export const db = drizzle(client, {
  schema,
  logger: {
    logQuery(query, params) {
      try {
        const text = Array.isArray(query) ? query.join(" ") : String(query);
        addQueryLog({ sql: text, ms: 0 });
        if (process.env.DB_LOG_QUERIES === "1") {
          console.debug(
            `[db] ${text.slice(0, 500)}${params?.length ? ` :: [${params.length}]` : ""}`
          );
        }
      } catch {}
    },
  },
});

export type DbClient = typeof db;
