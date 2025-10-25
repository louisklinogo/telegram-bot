"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GeneratePDFButton } from "@/components/invoice/generate-pdf-button";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useTransactionParams } from "@/hooks/use-transaction-params";
import { trpc } from "@/lib/trpc/client";

export function InvoiceDetailsDrawer({
  open,
  onOpenChange,
  invoice,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  invoice: any | null;
}) {
  const { data: allocations = [], isLoading } = trpc.transactions.allocationsByInvoice.useQuery(
    { invoiceId: invoice?.id || "" },
    { enabled: !!invoice?.id && open }
  );

  const deleteM = trpc.transactions.deleteAllocation.useMutation({
    onSuccess: () => {
      toast.success("Allocation removed");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to remove allocation"),
  });

  const { open: openTransactionSheet } = useTransactionParams();
  useEffect(() => {
    // refetch handled by TanStack via key changes
  }, [open, invoice?.id]);

  const removeAlloc = async (id: string) => {
    await (deleteM as any).mutateAsync({ id });
  };

  const paid = (invoice?.paid_amount || 0) as number;
  const outstanding = Math.max(0, invoice?.amount - paid);

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Invoice {invoice?.invoice_number}</DrawerTitle>
          <div className="text-muted-foreground text-sm">
            Client: {invoice?.order?.client?.name || "-"}
          </div>
        </DrawerHeader>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-6 text-sm">
            <div>Total: ₵{invoice?.amount?.toLocaleString()}</div>
            <div>Paid: ₵{paid.toLocaleString()}</div>
            <div>Outstanding: ₵{outstanding.toLocaleString()}</div>
          </div>
          <div className="rounded border p-3">
            <div className="mb-2 font-medium">Allocations</div>
            {isLoading ? (
              <div className="text-muted-foreground text-xs">Loading…</div>
            ) : allocations.length === 0 ? (
              <div className="text-muted-foreground text-xs">No allocations yet</div>
            ) : (
              <div className="space-y-2">
                {allocations.map((a) => (
                  <div className="flex items-center justify-between text-sm" key={a.id}>
                    <div>
                      <div>
                        TX {a.transaction?.transaction_number} — ₵{a.amount?.toLocaleString()}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {new Date(a.created_at).toLocaleString()}
                      </div>
                    </div>
                    <Button onClick={() => removeAlloc(a.id)} size="sm" variant="outline">
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DrawerFooter className="flex-row justify-between gap-2">
          <div className="flex gap-2">
            {outstanding > 0 && (
              <Button
                className="gap-2"
                onClick={() => {
                  openTransactionSheet({
                    invoiceId: invoice?.id,
                    clientId: invoice?.order?.client?.id,
                  });
                  onOpenChange(false);
                }}
              >
                <Plus className="h-4 w-4" />
                Record Payment
              </Button>
            )}
          </div>

          <div className="ml-auto flex gap-2">
            {invoice && (
              <GeneratePDFButton
                invoice={invoice}
                items={[]} // TODO: Add items from invoice
                size="default"
                variant="outline"
              />
            )}
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Close
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
