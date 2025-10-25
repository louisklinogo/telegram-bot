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
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create category</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs">Name</label>
            <Input
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Utilities, Sales"
              value={name}
            />
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs">Color</label>
            <div className="flex items-center gap-2">
              <input
                aria-label="Pick color"
                className="h-9 w-9 rounded border p-0"
                onChange={(e) => setColor(e.target.value)}
                type="color"
                value={color}
              />
              <Input className="w-28" onChange={(e) => setColor(e.target.value)} value={color} />
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
