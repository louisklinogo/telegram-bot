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
  parentId?: string | null;
};

export function CreateCategoryDialog({ open, onOpenChange, onCreated, parentId = null }: Props) {
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("#8B5CF6");

  const { mutateAsync, isPending } = trpc.transactions.categoriesCreate.useMutation({
    onSuccess: async () => {
      await utils.transactions.categories.invalidate();
      onCreated?.();
      onOpenChange(false);
      setName("");
    },
  });

  const submit = async () => {
    if (!name.trim()) return;
    await mutateAsync({ name: name.trim(), color, parentId: parentId ?? undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create category</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Utilities, Sales"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-9 rounded border p-0"
                aria-label="Pick color"
              />
              <Input value={color} onChange={(e) => setColor(e.target.value)} className="w-28" />
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
