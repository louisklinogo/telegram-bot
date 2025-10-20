"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TransactionForm } from "@/components/transaction-form";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TransactionCreateSheetLocal({ open, onOpenChange }: Props) {
  if (!open) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] bg-background p-0">
        <div className="p-6 pb-0 border-b">
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
