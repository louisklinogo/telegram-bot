"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTeamCurrency } from "@/hooks/use-team-currency";
import { trpc } from "@/lib/trpc/client";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
};

export function CreateAccountDialog({ open, onOpenChange, onCreated }: Props) {
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [type, setType] = useState<"cash" | "bank" | "mobile_money" | "card" | "other">("cash");
  const teamCurrency = useTeamCurrency();
  const [currency, setCurrency] = useState(teamCurrency);

  const { mutateAsync, isPending } = trpc.transactions.accountsCreate.useMutation({
    onSuccess: async () => {
      await utils.transactions.accounts.invalidate();
      onCreated?.();
      onOpenChange(false);
      setName("");
      setType("cash");
      setCurrency(teamCurrency);
    },
  });

  const submit = async () => {
    if (!name.trim()) return;
    await mutateAsync({ name: name.trim(), type, currency });
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create account</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs">Name</label>
            <Input
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cash till, Bank - GTBank"
              value={name}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">Type</label>
              <select
                className="w-full rounded border px-3 py-2 text-sm"
                onChange={(e) => setType(e.target.value as any)}
                value={type}
              >
                <option value="cash">cash</option>
                <option value="bank">bank</option>
                <option value="mobile_money">mobile_money</option>
                <option value="card">card</option>
                <option value="other">other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">Currency</label>
              <Input
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="GHS"
                value={currency}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={isPending} onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={!name.trim() || isPending} onClick={submit}>
            {isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
