"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient, updateClient, deleteClient } from "@/lib/supabase-mutations";
import { toast } from "sonner";

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Client created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create client: ${error.message}`);
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update client: ${error.message}`);
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Client deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete client: ${error.message}`);
    },
  });
}
