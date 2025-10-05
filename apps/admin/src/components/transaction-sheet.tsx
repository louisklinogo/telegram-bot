"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TransactionForm } from "@/components/transaction-form";
import { useTransactionParams } from "@/hooks/use-transaction-params";

export function TransactionSheet() {
  const { isOpen, type, invoiceId, clientId, close } = useTransactionParams();

  if (type !== "create") return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent className="overflow-y-auto sm:max-w-[600px] bg-background">
        <SheetHeader className="border-b pb-4 mb-2">
          <SheetTitle className="text-2xl">Record Transaction</SheetTitle>
        </SheetHeader>

        <TransactionForm 
          onSuccess={close} 
          defaultInvoiceId={invoiceId || undefined}
          defaultClientId={clientId || undefined}
        />
      </SheetContent>
    </Sheet>
  );
}
