"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TransactionForm } from "@/components/transaction-form";
import { useTransactionParams } from "@/hooks/use-transaction-params";

export function TransactionSheet() {
  const { isOpen, type, invoiceId, clientId, close } = useTransactionParams();

  if (type !== "create") return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent className="sm:max-w-[600px] bg-background p-0">
        <div className="p-6 pb-0 border-b">
          <SheetHeader>
            <SheetTitle className="text-2xl">Record Transaction</SheetTitle>
          </SheetHeader>
        </div>
        <ScrollArea className="h-full p-6 pb-[100px]">
          <TransactionForm
            onSuccess={close}
            defaultInvoiceId={invoiceId || undefined}
            defaultClientId={clientId || undefined}
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
