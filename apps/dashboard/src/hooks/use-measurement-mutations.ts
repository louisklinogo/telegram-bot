"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";

type CreateMeasurementInput = {
  client_id: string;
  record_name?: string;
  garment_type?: string;
  tags?: string[];
  measurements: Record<string, string>;
  notes?: string;
  taken_at?: string;
};

export function useCreateMeasurement() {
  const utils = trpc.useUtils();
  return trpc.measurements.create.useMutation({
    onSuccess: async () => {
      await utils.measurements.list.invalidate();
      toast.success("Measurement created successfully");
    },
    onError: (error: any) => toast.error(`Failed to create measurement: ${error?.message}`),
  });
}

export function useUpdateMeasurement() {
  const utils = trpc.useUtils();
  return trpc.measurements.update.useMutation({
    onSuccess: async () => {
      await utils.measurements.list.invalidate();
      toast.success("Measurement updated successfully");
    },
    onError: (error: any) => toast.error(`Failed to update measurement: ${error?.message}`),
  });
}

export function useDeleteMeasurement() {
  const utils = trpc.useUtils();
  return trpc.measurements.delete.useMutation({
    onSuccess: async () => {
      await utils.measurements.list.invalidate();
      toast.success("Measurement deleted successfully");
    },
    onError: (error: any) => toast.error(`Failed to delete measurement: ${error?.message}`),
  });
}
