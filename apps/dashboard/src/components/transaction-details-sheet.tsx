"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTransactionParams } from "@/hooks/use-transaction-params";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Transaction #</div>
                  <div>{(data as any).transaction.transactionNumber || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Origin</div>
                  <div>
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                      {(data as any).transaction.manual ? "Manual" : "System"}
                    </Badge>
                  </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Assigned</div>
                  <div>{(data as any).assignedUser?.fullName || (data as any).assignedUser?.email || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Excluded from analytics</div>
                  <div>{(data as any).transaction.excludeFromAnalytics ? "Yes" : "No"}</div>
                </div>
              </div>
              <TagsEditor transactionId={(data as any).transaction.id} existing={((data as any).tags ?? []) as any[]} />
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

type Tag = { id: string; name: string; color: string | null };

function TagsEditor({ transactionId, existing }: { transactionId: string; existing: Tag[] }) {
  const utils = trpc.useUtils();
  const { data: allTags = [] } = trpc.tags.list.useQuery();
  const addTag = trpc.transactionTags.add.useMutation({
    onSuccess: async () => {
      await utils.transactions.byId.invalidate({ id: transactionId });
      await utils.transactions.enrichedList.invalidate();
    },
  });
  const removeTag = trpc.transactionTags.remove.useMutation({
    onSuccess: async () => {
      await utils.transactions.byId.invalidate({ id: transactionId });
      await utils.transactions.enrichedList.invalidate();
    },
  });

  const existingIds = new Set(existing.map((t) => t.id));

  return (
    <div>
      <div className="text-xs text-muted-foreground">Tags</div>
      <div className="flex flex-wrap gap-1 mb-2">
        {existing.length ? (
          existing.map((t) => (
            <span
              key={t.id}
              className="px-1.5 py-0.5 rounded text-[10px] border inline-flex items-center gap-1"
              style={t.color ? { backgroundColor: `${t.color}15`, borderColor: `${t.color}55` } : undefined}
            >
              {t.name}
              <button
                aria-label="Remove tag"
                className="ml-1 text-muted-foreground hover:text-foreground"
                onClick={() => removeTag.mutate({ transactionId, tagId: t.id })}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        ) : (
          <span>-</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {allTags
          .filter((t: any) => !existingIds.has(t.id))
          .map((t: any) => (
            <Button key={t.id} size="sm" variant="outline" onClick={() => addTag.mutate({ transactionId, tagId: t.id })}>
              + {t.name}
            </Button>
          ))}
      </div>
    </div>
  );
}
