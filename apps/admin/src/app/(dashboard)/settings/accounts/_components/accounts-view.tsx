"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreateAccountDialog } from "@/components/create-account-dialog";

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
        <div className="text-sm text-muted-foreground">{accounts.length} accounts</div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setOpen(true)}>
            New account
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/transactions">Back to Transactions</Link>
          </Button>
        </div>
      </div>
      <div className="divide-y">
        {accounts.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No accounts yet.</div>
        ) : (
          accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-4 text-sm">
              <div className="font-medium">{a.name}</div>
              <div className="text-muted-foreground">
                {a.type} • {a.currency} • {a.status}
              </div>
            </div>
          ))
        )}
      </div>
      <CreateAccountDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
