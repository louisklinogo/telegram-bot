"use client";

import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
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
  system?: boolean | null;
  taxType?: string | null;
  taxRate?: string | number | null;
  taxReportingCode?: string | null;
  excluded?: boolean | null;
  children?: CategoryNode[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string | null;
  categories?: CategoryNode[];
};

export function CategoryEditSheet({ open, onOpenChange, id, categories = [] }: Props) {
  const utils = trpc.useUtils();
  const router = useRouter();
  const { data } = trpc.transactionCategories.byId.useQuery({ id: id! }, { enabled: open && !!id });

  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("#8B5CF6");
  const [description, setDescription] = useState("");
  const [selectedParent, setSelectedParent] = useState<string | undefined>(undefined);
  const [taxType, setTaxType] = useState<string | undefined>(undefined);
  const [taxRate, setTaxRate] = useState<string>("");
  const [taxReportingCode, setTaxReportingCode] = useState("");
  const [excluded, setExcluded] = useState(false);

  useEffect(() => {
    if (!data) return;
    setName(data.name || "");
    setColor((data.color as string) || "#8B5CF6");
    setDescription((data.description as string) || "");
    setSelectedParent((data.parentId as string | null) ?? undefined);
    setTaxType((data.taxType as string | null) ?? undefined);
    setTaxRate((data.taxRate as any) ? String(data.taxRate) : "");
    setTaxReportingCode((data.taxReportingCode as string | null) ?? "");
    setExcluded(Boolean(data.excluded));
  }, [data]);

  const { mutateAsync, isPending } = trpc.transactionCategories.update.useMutation({
    onSuccess: async () => {
      await utils.transactionCategories.list.invalidate();
      onOpenChange(false);
      router.refresh();
    },
  });

  const deleteMutation = trpc.transactionCategories.delete.useMutation({
    onSuccess: async () => {
      await utils.transactionCategories.list.invalidate();
      onOpenChange(false);
      router.refresh();
    },
  });

  const submit = async () => {
    if (!id || !name.trim()) return;
    await mutateAsync({
      id,
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

  const flat = useMemo(() => flatten(categories), [categories]);
  const excludeIds = new Set<string>();
  if (id) {
    excludeIds.add(id);
    // Exclude descendants to prevent cycles
    const node = findNode(categories, id);
    if (node) gatherIds(node, excludeIds);
  }

  return (
    <Sheet open={open} onOpenChange={(o) => onOpenChange(o)}>
      <SheetContent>
        <SheetHeader className="mb-6 flex items-center justify-between flex-row">
          <h2 className="text-xl">Edit Category</h2>
          <div className="flex items-center gap-2">
            {id && (
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  if (!id) return;
                  if (window.confirm("Delete this category?")) {
                    await deleteMutation.mutateAsync({ id });
                  }
                }}
                title="Delete"
              >
                <Icons.Delete className="size-5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="p-0 m-0 size-auto hover:bg-transparent"
            >
              <Icons.Close className="size-5" />
            </Button>
          </div>
        </SheetHeader>

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
                placeholder="Category name"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Parent</label>
            <Select
              value={selectedParent ?? ""}
              onValueChange={(v) => setSelectedParent(v || undefined)}
              disabled={Boolean((data as any)?.system)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No parent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No parent</SelectItem>
                {flat
                  .filter((o) => !excludeIds.has(o.id))
                  .map((opt) => (
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

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!name.trim() || isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function flatten(nodes: CategoryNode[], depth = 0): Array<CategoryNode & { depth: number }> {
  const out: Array<CategoryNode & { depth: number }> = [];
  for (const n of nodes) {
    out.push({ ...n, depth });
    if (n.children && n.children.length > 0) out.push(...flatten(n.children, depth + 1));
  }
  return out;
}

function findNode(nodes: CategoryNode[], id: string): CategoryNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const f = findNode(n.children, id);
      if (f) return f;
    }
  }
  return null;
}

function gatherIds(node: CategoryNode, set: Set<string>) {
  if (!node.children) return;
  for (const c of node.children) {
    set.add(c.id);
    gatherIds(c, set);
  }
}
