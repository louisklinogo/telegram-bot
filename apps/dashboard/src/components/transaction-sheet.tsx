"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TransactionForm } from "@/components/transaction-form";
import { useTransactionParams } from "@/hooks/use-transaction-params";

export function TransactionSheet() {
  const { isOpen, sheet, invoiceId, clientId, close } = useTransactionParams();

  if (sheet !== "create") return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent className="flex flex-col overflow-hidden sm:max-w-[650px] p-0">
        <SheetHeader className="px-6 pt-6 pb-0 flex-shrink-0">
          <SheetTitle className="text-xl">Record Transaction</SheetTitle>
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
