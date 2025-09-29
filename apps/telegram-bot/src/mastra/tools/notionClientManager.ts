import type { ClientRecord } from "@cimantikos/services";
import { ensureClient, getSupabaseServiceClient } from "@cimantikos/services";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const notionClientManager = createTool({
  id: "notion-client-manager",
  description: "Manage client records stored in Supabase (create, read, update, search)",
  inputSchema: z.object({
    action: z.enum(["create", "read", "update", "search"]).describe("Action to perform"),
    client_data: z
      .object({
        name: z.string().min(1).describe("Client full name"),
        phone: z.string().optional().describe("Client phone number"),
        email: z.string().optional().describe("Client email address"),
        address: z.string().optional().describe("Client physical address"),
        notes: z.string().optional().describe("Internal notes"),
      })
      .optional(),
    client_id: z.string().optional().describe("Client record ID"),
    search_query: z.string().optional().describe("Search by name or phone"),
    limit: z.number().min(1).max(100).default(10),
  }),
  execute: async ({ context }) => {
    const { action, client_data, client_id, search_query, limit } = context;
    const supabase = getSupabaseServiceClient();

    try {
      switch (action) {
        case "create": {
          if (!client_data) {
            return {
              success: false,
              error: "Client data required for creation",
            };
          }

          const client = await ensureClient({
            name: client_data.name,
            phone: client_data.phone,
            email: client_data.email,
            address: client_data.address,
            notes: client_data.notes,
          });

          return {
            success: true,
            data: {
              client_id: client.id,
              client,
            },
          };
        }
        case "read": {
          if (!client_id) {
            return {
              success: false,
              error: "Client ID required for read operation",
            };
          }

          const { data, error } = await supabase
            .from("clients")
            .select("*")
            .eq("id", client_id)
            .maybeSingle();

          if (error) {
            return { success: false, error: error.message };
          }

          if (!data) {
            return { success: false, error: "Client not found" };
          }

          return { success: true, data: { client: data as ClientRecord } };
        }
        case "update": {
          if (!client_id || !client_data) {
            return {
              success: false,
              error: "Client ID and data required for update",
            };
          }

          const updatePayload = {
            name: client_data.name,
            phone: client_data.phone ?? null,
            email: client_data.email ?? null,
            address: client_data.address ?? null,
            notes: client_data.notes ?? null,
          };

          const { data, error } = await supabase
            .from("clients")
            .update(updatePayload)
            .eq("id", client_id)
            .select("*")
            .maybeSingle();

          if (error) {
            return { success: false, error: error.message };
          }

          if (!data) {
            return { success: false, error: "Client not found" };
          }

          return { success: true, data: { client: data as ClientRecord } };
        }
        case "search": {
          if (!search_query) {
            return { success: false, error: "Search query required" };
          }

          const { data, error } = await supabase
            .from("clients")
            .select("*")
            .or(`name.ilike.%${search_query}%,phone.ilike.%${search_query}%`)
            .order("created_at", { ascending: false })
            .limit(limit);

          if (error) {
            return { success: false, error: error.message };
          }

          return {
            success: true,
            data: {
              clients: (data as ClientRecord[] | null) ?? [],
              total: data?.length ?? 0,
              query: search_query,
            },
          };
        }
        default:
          return { success: false, error: `Unknown action: ${String(action)}` };
      }
    } catch (error) {
      console.error("Client Manager Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});
