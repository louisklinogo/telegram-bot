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
import { InputColor } from "./input-color";
import { Combobox, type Option } from "@/components/ui/combobox";
import { SubmitButton } from "@/components/ui/submit-button";

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
  const currentNode = useMemo(() => (id ? findNode(categories, id) : null), [categories, id]);
  const hasChildren = Boolean(currentNode && currentNode.children && currentNode.children.length > 0);
  const excludeIds = new Set<string>();
  if (id) {
    excludeIds.add(id);
    // Exclude descendants to prevent cycles
    const node = findNode(categories, id);
    if (node) gatherIds(node, excludeIds);
  }

  const parentOptions: Option[] = useMemo(() => {
    const flat = flatten(categories);
    return flat.map((opt) => ({ id: opt.id, name: `${"\u00A0".repeat(opt.depth * 2)}${opt.name}` }));
  }, [categories]);

  return (
    <Sheet open={open} onOpenChange={(o) => onOpenChange(o)}>
      <SheetContent className="flex flex-col overflow-hidden p-0">
        <SheetHeader className="px-6 pt-6 pb-2 flex items-center justify-between flex-row">
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

        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4 space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <InputColor
                name={name}
                color={color}
                placeholder="Name"
                onChange={({ name: n, color: c }) => {
                  setName(n);
                  setColor(c);
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Parent Category (Optional)</label>
              {hasChildren ? (
                <div className="flex items-center space-x-2 p-3 py-2 border border-border bg-muted/50">
                  <span className="text-sm text-muted-foreground">Cannot change parent - this category has children</span>
                </div>
              ) : (
                <Combobox
                  options={parentOptions.filter((o) => !excludeIds.has(o.id))}
                  value={parentOptions.find((o) => o.id === selectedParent)}
                  onSelect={(opt) => setSelectedParent(opt?.id)}
                  onRemove={() => setSelectedParent(undefined)}
                  placeholder="Select parent category"
                  disabled={Boolean((data as any)?.system)}
                  showIcon={false}
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tax Type</label>
                <Select value={taxType ?? "none"} onValueChange={(v) => setTaxType(v === "none" ? undefined : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tax type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Custom Tax</SelectItem>
                    <SelectItem value="vat">VAT</SelectItem>
                    <SelectItem value="gst">GST</SelectItem>
                    <SelectItem value="sales_tax">Sales Tax</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tax Rate</label>
                <Input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="Tax Rate" />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">For unsupported or internal tax logic.</div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Report Code</label>
              <Input value={taxReportingCode} onChange={(e) => setTaxReportingCode(e.target.value)} placeholder="Report Code" />
            </div>

            <div className="border border-border p-3 mt-2 pt-1.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Exclude from Reports</div>
                <div className="text-xs text-muted-foreground">Transactions in this category won't appear in financial reports</div>
              </div>
              <Switch checked={excluded} onCheckedChange={setExcluded} />
            </div>
          </div>

          <div className="mt-auto sticky bottom-0 bg-background px-6 py-4 border-t z-10">
            <SubmitButton onClick={submit} disabled={!name.trim()} isSubmitting={isPending} className="w-full">
              Update
            </SubmitButton>
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
