"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type Props = {
  disabled?: boolean;
};

export function TransactionsWidget({ disabled }: Props) {
  const [data] = trpc.transactions.list.useSuspenseQuery({ limit: 15 });
  const items = (data as any)?.items ?? [];

  return (
    <div className="relative aspect-square overflow-hidden border p-4 md:p-8">
      <div className="flex justify-between">
        <div>
          <Link href="/transactions" prefetch>
            <h2 className="text-lg">Transactions</h2>
          </Link>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center pb-2 text-muted-foreground text-xs">
          <div className="w-2/3">Description</div>
          <div className="w-1/3 text-right">Amount</div>
        </div>
        {items?.length ? (
          <ul className="scrollbar-hide aspect-square divide-y overflow-auto pb-24">
            {items.map((r: any) => {
              const trx = r.trx || r.transaction || r;
              const client = r.client;
              return (
                <li className="py-2" key={trx.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2/3 min-w-0">
                      <div className="truncate font-medium text-sm">
                        {trx.name || trx.description || "—"}
                      </div>
                      <div className="truncate text-muted-foreground text-xs">
                        {client?.name || "Unknown"}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "w-1/3 text-right text-sm",
                        trx.type === "expense" ? "text-red-500" : "text-emerald-500"
                      )}
                    >
                      {trx.currency ?? ""} {Number(trx.amount || 0).toLocaleString()}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex aspect-square items-center justify-center">
            <p className="-mt-12 text-muted-foreground text-sm">No transactions found</p>
          </div>
        )}
      </div>
    </div>
  );
}
