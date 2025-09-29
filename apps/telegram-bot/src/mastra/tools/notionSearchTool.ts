import { getSupabaseServiceClient } from "@cimantikos/services";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

type ClientRow = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  created_at: string;
};

type OrderRow = {
  id: string;
  order_number: string;
  total_price: number;
  status?: string | null;
  created_at: string;
};

type MeasurementRow = {
  id: string;
  record_name: string;
  taken_at?: string | null;
  client_id?: string | null;
};

export const notionSearchTool = createTool({
  id: "notion-search-tool",
  description: "Search across Supabase data (clients, orders, measurements) with filters",
  inputSchema: z.object({
    query: z.string().describe("Search query text"),
    database: z.enum(["clients", "orders", "measurements", "all"]).default("all"),
    filters: z
      .object({
        date_range: z
          .object({
            start: z.string().optional(),
            end: z.string().optional(),
          })
          .optional(),
        client_name: z.string().optional(),
        status: z.string().optional(),
        paid: z.boolean().optional(),
      })
      .optional(),
  }),
  execute: async ({ context }) => {
    const { query, database, filters } = context;
    const supabase = getSupabaseServiceClient();

    const results: Array<Record<string, unknown>> = [];
    const targets = database === "all" ? ["clients", "orders", "measurements"] : [database];

    for (const target of targets) {
      try {
        if (target === "clients") {
          const { data, error } = await supabase
            .from("clients")
            .select("*")
            .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
            .order("created_at", { ascending: false })
            .limit(20);

          if (error) throw new Error(error.message);

          const rows = (data ?? []) as ClientRow[];
          rows.forEach((row) => {
            results.push({
              type: "client",
              id: row.id,
              name: row.name,
              phone: row.phone ?? null,
              email: row.email ?? null,
              created_at: row.created_at,
            });
          });
        } else if (target === "orders") {
          let queryBuilder = supabase
            .from("orders")
            .select("*")
            .or(`order_number.ilike.%${query}%,notes.ilike.%${query}%`)
            .order("created_at", { ascending: false })
            .limit(20);

          if (filters?.status) {
            queryBuilder = queryBuilder.eq("status", filters.status);
          }

          const { data, error } = await queryBuilder;
          if (error) throw new Error(error.message);

          const rows = (data ?? []) as OrderRow[];
          rows.forEach((row) => {
            results.push({
              type: "order",
              id: row.id,
              order_number: row.order_number,
              total_price: row.total_price,
              status: row.status ?? null,
              created_at: row.created_at,
            });
          });
        } else if (target === "measurements") {
          let queryBuilder = supabase
            .from("measurements")
            .select("*")
            .or(`record_name.ilike.%${query}%,notes.ilike.%${query}%`)
            .order("taken_at", { ascending: false })
            .limit(20);

          if (filters?.date_range?.start) {
            queryBuilder = queryBuilder.gte("taken_at", filters.date_range.start);
          }

          if (filters?.date_range?.end) {
            queryBuilder = queryBuilder.lte("taken_at", filters.date_range.end);
          }

          const { data, error } = await queryBuilder;
          if (error) throw new Error(error.message);

          const rows = (data ?? []) as MeasurementRow[];
          rows.forEach((row) => {
            results.push({
              type: "measurement",
              id: row.id,
              record_name: row.record_name,
              taken_at: row.taken_at ?? null,
              client_id: row.client_id ?? null,
            });
          });
        }
      } catch (error) {
        console.error(`Error searching ${target}:`, error);
      }
    }

    return {
      success: true,
      total_results: results.length,
      results: results.slice(0, 10),
      searched_databases: targets,
      query,
      filters,
    };
  },
});
