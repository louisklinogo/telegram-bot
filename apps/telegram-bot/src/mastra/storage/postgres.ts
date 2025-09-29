import { getSupabaseConnectionString } from "@cimantikos/services";
import { PgVector, PostgresStore } from "@mastra/pg";

const connectionString = getSupabaseConnectionString();

export const createMastraPostgresStore = () =>
  new PostgresStore({
    connectionString,
    schemaName: "public",
  });

export const mastraPostgresStore = createMastraPostgresStore();

export const createMastraPgVector = () =>
  new PgVector({
    connectionString,
    schemaName: "public",
  });
