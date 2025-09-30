import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateInvoiceStatus } from "@/lib/supabase-mutations";

export function useMarkInvoiceAsPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      // Set paid_at to current timestamp
      const paidAt = new Date().toISOString();
      return updateInvoiceStatus(invoiceId, "paid", paidAt);
    },
    onSuccess: () => {
      // Invalidate and refetch invoices
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice marked as paid");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update invoice: ${error.message}`);
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, paidAt }: { id: string; status: string; paidAt?: string }) => {
      return updateInvoiceStatus(id, status, paidAt);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice status updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update invoice: ${error.message}`);
    },
  });
}
