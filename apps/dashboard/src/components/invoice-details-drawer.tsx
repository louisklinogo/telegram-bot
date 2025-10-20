"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc/client";
import { useTransactionParams } from "@/hooks/use-transaction-params";
import { Plus, Download } from "lucide-react";
import { GeneratePDFButton } from "@/components/invoice/generate-pdf-button";

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
    { enabled: !!invoice?.id && open },
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Invoice {invoice?.invoice_number}</DrawerTitle>
          <div className="text-sm text-muted-foreground">
            Client: {invoice?.order?.client?.name || "-"}
          </div>
        </DrawerHeader>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-6 text-sm">
            <div>Total: ₵{invoice?.amount?.toLocaleString()}</div>
            <div>Paid: ₵{paid.toLocaleString()}</div>
            <div>Outstanding: ₵{outstanding.toLocaleString()}</div>
          </div>
          <div className="border rounded p-3">
            <div className="font-medium mb-2">Allocations</div>
            {isLoading ? (
              <div className="text-xs text-muted-foreground">Loading…</div>
            ) : allocations.length === 0 ? (
              <div className="text-xs text-muted-foreground">No allocations yet</div>
            ) : (
              <div className="space-y-2">
                {allocations.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <div>
                      <div>
                        TX {a.transaction?.transaction_number} — ₵{a.amount?.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString()}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => removeAlloc(a.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DrawerFooter className="flex-row gap-2 justify-between">
          <div className="flex gap-2">
            {outstanding > 0 && (
              <Button
                onClick={() => {
                  openTransactionSheet({
                    invoiceId: invoice?.id,
                    clientId: invoice?.order?.client?.id,
                  });
                  onOpenChange(false);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Record Payment
              </Button>
            )}
          </div>

          <div className="flex gap-2 ml-auto">
            {invoice && (
              <GeneratePDFButton
                invoice={invoice}
                items={[]} // TODO: Add items from invoice
                variant="outline"
                size="default"
              />
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
