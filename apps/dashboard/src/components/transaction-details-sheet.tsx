"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTransactionParams } from "@/hooks/use-transaction-params";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";

export function TransactionDetailsSheet() {
  const { isOpen, transactionId, close } = useTransactionParams();

  const enabled = Boolean(transactionId);
  const { data, isLoading } = trpc.transactions.byId.useQuery(
    { id: transactionId as string },
    { enabled },
  );

  if (!transactionId) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent className="sm:max-w-[620px] bg-background p-0">
        <div className="p-6 pb-0 border-b">
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
                  <div className="text-xs text-muted-foreground">Date</div>
                  <div>{new Date((data as any).transaction.date as any).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Amount</div>
                  <div>
                    {(data as any).transaction.currency}{" "}
                    {Number((data as any).transaction.amount).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Type</div>
                  <div>{(data as any).transaction.type}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div>{(data as any).transaction.status}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Description</div>
                <div>{(data as any).transaction.description || "-"}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Client</div>
                  <div>{(data as any).client?.name || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Category</div>
                  <div>
                    {(data as any).category?.name || (data as any).transaction.categorySlug || "-"}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Method</div>
                  <div>{(data as any).transaction.paymentMethod || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Reference</div>
                  <div>{(data as any).transaction.paymentReference || "-"}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Notes</div>
                <div>{(data as any).transaction.notes || "-"}</div>
              </div>
            </div>
          ) : null}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
