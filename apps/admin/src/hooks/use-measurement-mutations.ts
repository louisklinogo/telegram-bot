"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createMeasurement,
  deleteMeasurement,
  updateMeasurement,
} from "@/lib/supabase-mutations";

export function useCreateMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMeasurement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      toast.success("Measurement created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create measurement: ${error.message}`);
    },
  });
}

export function useUpdateMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateMeasurement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      toast.success("Measurement updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update measurement: ${error.message}`);
    },
  });
}

export function useDeleteMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMeasurement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      toast.success("Measurement deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete measurement: ${error.message}`);
    },
  });
}
