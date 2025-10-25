"use client";

import Link from "next/link";
import { useState } from "react";
import { CreateAccountDialog } from "@/components/create-account-dialog";
import { Button } from "@/components/ui/button";

type Account = {
  id: string;
  name: string | null;
  currency: string | null;
  type: string | null;
  status: string | null;
};

export function AccountsView({ initialAccounts }: { initialAccounts: Account[] }) {
  const [open, setOpen] = useState(false);
  const [accounts] = useState(initialAccounts);

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between p-4">
        <div className="text-muted-foreground text-sm">{accounts.length} accounts</div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setOpen(true)} size="sm">
            New account
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/transactions">Back to Transactions</Link>
          </Button>
        </div>
      </div>
      <div className="divide-y">
        {accounts.length === 0 ? (
          <div className="p-4 text-muted-foreground text-sm">No accounts yet.</div>
        ) : (
          accounts.map((a) => (
            <div className="flex items-center justify-between p-4 text-sm" key={a.id}>
              <div className="font-medium">{a.name}</div>
              <div className="text-muted-foreground">
                {a.type} • {a.currency} • {a.status}
              </div>
            </div>
          ))
        )}
      </div>
      <CreateAccountDialog onOpenChange={setOpen} open={open} />
    </div>
  );
}
