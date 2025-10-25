"use client";

import { TransactionForm } from "@/components/transaction-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TransactionCreateSheetLocal({ open, onOpenChange }: Props) {
  if (!open) return null;
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="bg-background p-0 sm:max-w-[600px]">
        <div className="border-b p-6 pb-0">
          <SheetHeader>
            <SheetTitle className="text-2xl">Record Transaction</SheetTitle>
          </SheetHeader>
        </div>
        <ScrollArea className="h-full p-6 pb-[100px]">
          <TransactionForm onSuccess={() => onOpenChange(false)} />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
