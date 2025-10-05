import { toast } from "sonner";
import type { InvoiceWithOrder } from "@/lib/supabase-queries";
import { trpc } from "@/lib/trpc/client";

export function useMarkInvoiceAsPaid() {
  const utils = trpc.useUtils();
  const m = trpc.invoices.updateStatus.useMutation({
    onSuccess: async () => {
      await utils.invoices.list.invalidate();
      toast.success("Invoice marked as paid");
    },
    onError: (error: any) => toast.error(`Failed to update invoice: ${error?.message}`),
  });

  return m as any;
}

export function useUpdateInvoiceStatus() {
  const utils = trpc.useUtils();
  const m = trpc.invoices.updateStatus.useMutation({
    onSuccess: async () => {
      await utils.invoices.list.invalidate();
      toast.success("Invoice status updated");
    },
    onError: (error: any) => toast.error(`Failed to update invoice: ${error?.message}`),
  });

  return m;
}

// Record payment by creating a transaction and allocating it to the invoice (full outstanding)
export function useRecordInvoicePayment() {
  const utils = trpc.useUtils();
  const createPayment = trpc.transactions.createPayment.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      utils.transactions.list.invalidate();
      toast.success("Payment recorded and allocated");
    },
    onError: (error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });

  return {
    ...createPayment,
    mutate: (invoice: InvoiceWithOrder) => {
      const paidAmount = (invoice as any).paid_amount || 0;
      const outstanding = Math.max(0, invoice.amount - paidAmount);
      if (outstanding <= 0) return;
      
      createPayment.mutate({
        amount: outstanding,
        currency: ((invoice as any).currency as string) || "GHS",
        description: `Payment for invoice ${invoice.invoice_number}`,
        clientId: (invoice.order as any)?.client?.id,
        orderId: (invoice.order as any)?.id,
        invoiceId: invoice.id,
      });
    },
  };
}
