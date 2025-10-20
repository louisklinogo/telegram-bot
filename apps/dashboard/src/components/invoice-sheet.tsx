"use client";

import { useInvoiceParams } from "@/hooks/use-invoice-params";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { InvoiceForm } from "./invoice-form";

export function InvoiceSheet() {
  const { isOpen, type, invoiceId, orderId, close } = useInvoiceParams();

  const title = type === "create" ? "Create Invoice" : "Edit Invoice";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent className="overflow-y-auto sm:max-w-[800px] bg-background">
        <SheetHeader className="border-b pb-4 mb-2">
          <SheetTitle className="text-2xl">{title}</SheetTitle>
        </SheetHeader>

        <InvoiceForm invoiceId={invoiceId} orderId={orderId || undefined} onSuccess={close} />
      </SheetContent>
    </Sheet>
  );
}
