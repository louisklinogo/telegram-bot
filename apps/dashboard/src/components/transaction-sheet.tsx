"use client";

import { TransactionForm } from "@/components/transaction-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTransactionParams } from "@/hooks/use-transaction-params";

export function TransactionSheet() {
  const { isOpen, sheet, invoiceId, clientId, close } = useTransactionParams();

  if (sheet !== "create") return null;

  return (
    <Sheet onOpenChange={(open) => !open && close()} open={isOpen}>
      <SheetContent className="flex flex-col overflow-hidden p-0 sm:max-w-[650px]">
        <SheetHeader className="flex-shrink-0 px-6 pt-6 pb-0">
          <SheetTitle className="text-xl">Record Transaction</SheetTitle>
        </SheetHeader>
        <TransactionForm
          defaultClientId={clientId || undefined}
          defaultInvoiceId={invoiceId || undefined}
          onSuccess={close}
        />
      </SheetContent>
    </Sheet>
  );
}
