"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useInvoiceParams } from "@/hooks/use-invoice-params";
import { InvoiceForm } from "./invoice-form";

export function InvoiceSheet() {
  const { isOpen, type, invoiceId, orderId, close } = useInvoiceParams();

  const title = type === "create" ? "Create Invoice" : "Edit Invoice";

  return (
    <Sheet onOpenChange={(open) => !open && close()} open={isOpen}>
      <SheetContent className="overflow-y-auto bg-background sm:max-w-[800px]">
        <SheetHeader className="mb-2 border-b pb-4">
          <SheetTitle className="text-2xl">{title}</SheetTitle>
        </SheetHeader>

        <InvoiceForm invoiceId={invoiceId} onSuccess={close} orderId={orderId || undefined} />
      </SheetContent>
    </Sheet>
  );
}
