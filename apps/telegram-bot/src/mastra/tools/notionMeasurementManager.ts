import type { MeasurementRecord, MeasurementValueRecord } from "@cimantikos/services";
import { createMeasurement, getSupabaseServiceClient } from "@cimantikos/services";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const parseMeasurementText = (text: string): Record<string, string> => {
  const measurements: Record<string, string> = {};
  const parts = text.split(/\s+/);

  for (let i = 0; i < parts.length - 1; i += 2) {
    const keyRaw = parts[i];
    const value = parts[i + 1];
    if (!keyRaw || !value) continue;

    const key = keyRaw.toLowerCase();
    measurements[key] = value;
  }

  return measurements;
};

const buildValuesPayload = (
  data: Record<string, unknown>,
): { key: string; value: string | number }[] => {
  return Object.entries(data)
    .filter(([key]) => !["measurement_name", "client_id", "date_taken", "notes"].includes(key))
    .map(([key, value]) => ({ key, value: value as string | number }));
};

const fetchMeasurement = async (measurementId: string) => {
  const supabase = getSupabaseServiceClient();

  const [{ data: measurement, error: measurementError }, { data: values, error: valuesError }] =
    await Promise.all([
      supabase.from("measurements").select("*").eq("id", measurementId).maybeSingle(),
      supabase.from("measurement_values").select("*").eq("measurement_id", measurementId),
    ]);

  if (measurementError) {
    throw new Error(measurementError.message);
  }

  if (!measurement) {
    return null;
  }

  if (valuesError) {
    throw new Error(valuesError.message);
  }

  return {
    measurement: measurement as MeasurementRecord,
    values: (values as MeasurementValueRecord[] | null) ?? [],
  };
};

export const notionMeasurementManager = createTool({
  id: "notion-measurement-manager",
  description: "Manage measurement records in Supabase",
  inputSchema: z.object({
    action: z.enum(["create", "read", "update", "search"]).describe("Action to perform"),
    measurement_data: z
      .object({
        measurement_name: z.string().min(1),
        client_id: z.string(),
        notes: z.string().optional(),
        date_taken: z.string().optional(),
      })
      .catchall(z.union([z.string(), z.number()]))
      .optional(),
    measurement_id: z.string().optional(),
    client_id: z.string().optional(),
    search_query: z.string().optional(),
    measurement_text: z.string().optional(),
    limit: z.number().min(1).max(100).default(10),
  }),
  execute: async ({ context }) => {
    const {
      action,
      measurement_data,
      measurement_id,
      client_id,
      search_query,
      measurement_text,
      limit,
    } = context;
    const supabase = getSupabaseServiceClient();

    try {
      if (measurement_text) {
        return {
          success: true,
          data: {
            parsed_measurements: parseMeasurementText(measurement_text),
            raw_text: measurement_text,
          },
        };
      }

      switch (action) {
        case "create": {
          if (!measurement_data) {
            return {
              success: false,
              error: "Measurement data required for creation",
            };
          }

          const payload = await createMeasurement({
            clientId: measurement_data.client_id,
            recordName: measurement_data.measurement_name,
            notes: measurement_data.notes || null,
            takenAt: measurement_data.date_taken || new Date().toISOString(),
            values: buildValuesPayload(measurement_data as Record<string, unknown>),
          });

          return {
            success: true,
            data: {
              measurement_id: payload.measurement.id,
              measurement: payload.measurement,
              values: payload.values,
            },
          };
        }
        case "read": {
          if (!measurement_id) {
            return {
              success: false,
              error: "Measurement ID required for read operation",
            };
          }

          const result = await fetchMeasurement(measurement_id);

          if (!result) {
            return { success: false, error: "Measurement not found" };
          }

          return { success: true, data: result };
        }
        case "update": {
          if (!measurement_id || !measurement_data) {
            return {
              success: false,
              error: "Measurement ID and data required for update",
            };
          }

          const updatePayload = {
            record_name: measurement_data.measurement_name,
            notes: measurement_data.notes ?? null,
            taken_at: measurement_data.date_taken ?? new Date().toISOString(),
          };

          const { error: updateError } = await supabase
            .from("measurements")
            .update(updatePayload)
            .eq("id", measurement_id);

          if (updateError) {
            return { success: false, error: updateError.message };
          }

          const { error: deleteError } = await supabase
            .from("measurement_values")
            .delete()
            .eq("measurement_id", measurement_id);

          if (deleteError) {
            return { success: false, error: deleteError.message };
          }

          const valuesPayload = buildValuesPayload(measurement_data as Record<string, unknown>).map(
            (value) => ({
              measurement_id,
              key: value.key,
              value_text: typeof value.value === "string" ? value.value : null,
              value_num: typeof value.value === "number" ? value.value : null,
            }),
          );

          if (valuesPayload.length > 0) {
            const { error: insertError } = await supabase
              .from("measurement_values")
              .insert(valuesPayload);

            if (insertError) {
              return { success: false, error: insertError.message };
            }
          }

          const result = await fetchMeasurement(measurement_id);

          return {
            success: true,
            data: result,
          };
        }
        case "search": {
          const query = supabase
            .from("measurements")
            .select("*")
            .order("taken_at", { ascending: false })
            .limit(limit);

          if (client_id) {
            query.eq("client_id", client_id);
          }

          if (search_query) {
            query.ilike("record_name", `%${search_query}%`);
          }

          const { data, error } = await query;

          if (error) {
            return { success: false, error: error.message };
          }

          return {
            success: true,
            data: {
              measurements: (data as MeasurementRecord[] | null) ?? [],
              total: data?.length ?? 0,
              client_id,
              query: search_query,
            },
          };
        }
        default:
          return { success: false, error: `Unknown action: ${String(action)}` };
      }
    } catch (error) {
      console.error("Measurement Manager Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});
