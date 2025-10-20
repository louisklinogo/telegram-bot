"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc/client";
import { Icons } from "@/components/ui/icons";
import { useRouter } from "next/navigation";

type CategoryNode = {
  id: string;
  name: string;
  color: string | null;
  parentId: string | null;
  children?: CategoryNode[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId?: string | null;
  categories?: CategoryNode[];
};

export function CategoryCreateSheet({
  open,
  onOpenChange,
  parentId = null,
  categories = [],
}: Props) {
  const utils = trpc.useUtils();
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("#8B5CF6");
  const [description, setDescription] = useState("");
  const [selectedParent, setSelectedParent] = useState<string | undefined>(parentId ?? undefined);
  const [taxType, setTaxType] = useState<string | undefined>(undefined);
  const [taxRate, setTaxRate] = useState<string>("");
  const [taxReportingCode, setTaxReportingCode] = useState("");
  const [excluded, setExcluded] = useState(false);

  const { mutateAsync, isPending } = trpc.transactionCategories.create.useMutation({
    onSuccess: async () => {
      await utils.transactionCategories.list.invalidate();
      onOpenChange(false);
      setName("");
      router.refresh();
    },
  });

  const submit = async () => {
    if (!name.trim()) return;
    await mutateAsync({
      name: name.trim(),
      color,
      description: description || undefined,
      parentId: selectedParent,
      taxType: taxType || undefined,
      taxRate: taxRate || undefined,
      taxReportingCode: taxReportingCode || undefined,
      excluded,
    } as any);
  };

  const flatOptions = flatten(categories).filter((o) => true);

  return (
    <Sheet open={open} onOpenChange={(o) => onOpenChange(o)}>
      <SheetContent className="flex flex-col overflow-hidden p-0">
        <SheetHeader className="px-6 pt-6 pb-0 flex-shrink-0">
          <SheetTitle className="text-xl">Create Category</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
          <div className="flex flex-col space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-9 rounded border p-0"
                aria-label="Pick color"
              />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Utilities, Sales"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Parent (optional)</label>
            <Select
              value={selectedParent ?? ""}
              onValueChange={(v) => setSelectedParent(v || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No parent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No parent</SelectItem>
                {flatOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {"".padStart(opt.depth * 2, "\u00A0")}
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tax Type</label>
              <Select value={taxType ?? ""} onValueChange={(v) => setTaxType(v || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tax type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  <SelectItem value="vat">VAT</SelectItem>
                  <SelectItem value="gst">GST</SelectItem>
                  <SelectItem value="sales_tax">Sales Tax</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tax Rate (%)</label>
              <Input
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder="e.g. 25"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Report Code</label>
            <Input
              value={taxReportingCode}
              onChange={(e) => setTaxReportingCode(e.target.value)}
              placeholder="Optional"
            />
          </div>

            <div className="flex items-center justify-between border p-3 mt-2">
              <div>
                <div className="text-xs text-muted-foreground">Exclude from reports</div>
                <div className="text-xs text-muted-foreground">
                  Transactions in this category won't appear in reports
                </div>
              </div>
              <Switch checked={excluded} onCheckedChange={setExcluded} />
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex justify-end gap-4 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim() || isPending}>
            {isPending ? "Creating…" : "Create"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function flatten(nodes: CategoryNode[], depth = 0): Array<CategoryNode & { depth: number }> {
  const out: Array<CategoryNode & { depth: number }> = [];
  for (const n of nodes) {
    out.push({ ...n, depth });
    if (n.children && n.children.length > 0) {
      out.push(...flatten(n.children, depth + 1));
    }
  }
  return out;
}
