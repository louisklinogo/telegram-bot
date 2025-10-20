"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [currency, setCurrency] = useState("GHS");

  const { mutateAsync, isPending } = trpc.transactions.accountsCreate.useMutation({
    onSuccess: async () => {
      await utils.transactions.accounts.invalidate();
      onCreated?.();
      onOpenChange(false);
      setName("");
      setType("cash");
      setCurrency("GHS");
    },
  });

  const submit = async () => {
    if (!name.trim()) return;
    await mutateAsync({ name: name.trim(), type, currency });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create account</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cash till, Bank - GTBank"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full rounded border px-3 py-2 text-sm"
              >
                <option value="cash">cash</option>
                <option value="bank">bank</option>
                <option value="mobile_money">mobile_money</option>
                <option value="card">card</option>
                <option value="other">other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Currency</label>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="GHS"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim() || isPending}>
            {isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
