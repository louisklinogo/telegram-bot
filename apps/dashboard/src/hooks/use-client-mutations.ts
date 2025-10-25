"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";

export function useCreateClient() {
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();

  const m = trpc.clients.create.useMutation({
    onSuccess: async () => {
      // Invalidate tRPC cache
      await utils.clients.list.invalidate();
      // Invalidate custom query key used in clients-view
      await queryClient.invalidateQueries({ queryKey: ["clients.list"] });
      toast.success("Client created successfully");
    },
    onError: (error: any) => toast.error(`Failed to create client: ${error?.message}`),
  });

  // Map supabase-style payload to tRPC input
  const map = (payload: any) => ({
    name: payload.name,
    whatsapp: payload.whatsapp,
    phone: payload.phone ?? null,
    email: payload.email ?? null,
    address: payload.address ?? null,
    country: payload.country ?? null,
    countryCode: payload.countryCode ?? null,
    company: payload.company ?? null,
    occupation: payload.occupation ?? null,
    referralSource: payload.referral_source ?? payload.referralSource ?? null,
    tags: payload.tags ?? null,
    notes: payload.notes ?? null,
  });

  return {
    ...m,
    mutate: (payload: any, opts?: any) => (m as any).mutate(map(payload), opts),
    mutateAsync: (payload: any, opts?: any) => (m as any).mutateAsync(map(payload), opts),
  } as typeof m;
}

export function useUpdateClient() {
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();

  const m = trpc.clients.update.useMutation({
    onSuccess: async () => {
      // Invalidate tRPC cache
      await utils.clients.list.invalidate();
      // Invalidate custom query key used in clients-view
      await queryClient.invalidateQueries({ queryKey: ["clients.list"] });
      toast.success("Client updated successfully");
    },
    onError: (error: any) => toast.error(`Failed to update client: ${error?.message}`),
  });

  const map = ({ id, data }: { id: string; data: any }) => ({
    id,
    name: data.name ?? undefined,
    whatsapp: data.whatsapp ?? undefined,
    phone: data.phone ?? undefined,
    email: data.email ?? undefined,
    address: data.address ?? undefined,
    country: data.country ?? undefined,
    countryCode: data.countryCode ?? undefined,
    company: data.company ?? undefined,
    occupation: data.occupation ?? undefined,
    referralSource: data.referral_source ?? data.referralSource ?? undefined,
    tags: data.tags ?? undefined,
    notes: data.notes ?? undefined,
  });

  return {
    ...m,
    mutate: (payload: { id: string; data: any }, opts?: any) =>
      (m as any).mutate(map(payload), opts),
    mutateAsync: (payload: { id: string; data: any }, opts?: any) =>
      (m as any).mutateAsync(map(payload), opts),
  } as typeof m;
}

export function useDeleteClient() {
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();

  return trpc.clients.delete.useMutation({
    onSuccess: async () => {
      // Invalidate tRPC cache
      await utils.clients.list.invalidate();
      // Invalidate custom query key used in clients-view
      await queryClient.invalidateQueries({ queryKey: ["clients.list"] });
      toast.success("Client deleted successfully");
    },
    onError: (error: any) => toast.error(`Failed to delete client: ${error?.message}`),
  });
}
