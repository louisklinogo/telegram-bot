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
    <div className="border aspect-square overflow-hidden relative p-4 md:p-8">
      <div className="flex justify-between">
        <div>
          <Link href="/transactions" prefetch>
            <h2 className="text-lg">Transactions</h2>
          </Link>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center text-xs text-muted-foreground pb-2">
          <div className="w-2/3">Description</div>
          <div className="w-1/3 text-right">Amount</div>
        </div>
        {items?.length ? (
          <ul className="divide-y overflow-auto scrollbar-hide aspect-square pb-24">
            {items.map((r: any) => {
              const trx = r.trx || r.transaction || r;
              const client = r.client;
              return (
                <li key={trx.id} className="py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2/3 min-w-0">
                      <div className="text-sm font-medium truncate">{trx.name || trx.description || "—"}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {client?.name || "Unknown"}
                      </div>
                    </div>
                    <div className={cn("w-1/3 text-right text-sm", trx.type === "expense" ? "text-red-500" : "text-emerald-500")}> 
                      {trx.currency ?? ""} {Number(trx.amount || 0).toLocaleString()} 
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex items-center justify-center aspect-square">
            <p className="text-sm text-muted-foreground -mt-12">No transactions found</p>
          </div>
        )}
      </div>
    </div>
  );
}
