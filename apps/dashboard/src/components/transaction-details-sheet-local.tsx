"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

type Props = {
  open: boolean;
  transactionId?: string;
  onOpenChange: (open: boolean) => void;
};

export function TransactionDetailsSheetLocal({ open, transactionId, onOpenChange }: Props) {
  const enabled = open && !!transactionId;
  const { data, isLoading } = trpc.transactions.byId.useQuery(
    { id: transactionId as string },
    { enabled }
  );

  if (!open) return null;

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="bg-background p-0 sm:max-w-[620px]">
        <div className="border-b p-6 pb-0">
          <SheetHeader>
            <SheetTitle className="text-2xl">Transaction Details</SheetTitle>
          </SheetHeader>
        </div>
        <ScrollArea className="h-full p-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : data ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-muted-foreground text-xs">Date</div>
                  <div>{new Date((data as any).transaction.date as any).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Amount</div>
                  <div>
                    {(data as any).transaction.currency}{" "}
                    {Number((data as any).transaction.amount).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Type</div>
                  <div>{(data as any).transaction.type}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Status</div>
                  <div>{(data as any).transaction.status}</div>
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Description</div>
                <div>{(data as any).transaction.description || "-"}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-muted-foreground text-xs">Client</div>
                  <div>{(data as any).client?.name || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Category</div>
                  <div>
                    {(data as any).category?.name || (data as any).transaction.categorySlug || "-"}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-muted-foreground text-xs">Method</div>
                  <div>{(data as any).transaction.paymentMethod || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Reference</div>
                  <div>{(data as any).transaction.paymentReference || "-"}</div>
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Notes</div>
                <div>{(data as any).transaction.notes || "-"}</div>
              </div>
            </div>
          ) : null}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
