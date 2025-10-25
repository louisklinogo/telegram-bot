"use client";

import { Label } from "@Faworra/ui/label";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import { useTeamCurrency } from "@/hooks/use-team-currency";
import { trpc } from "@/lib/trpc/client";

export function VariantsSheet() {
  const router = useRouter();
  const params = useSearchParams();
  const productId = params.get("productId");
  const open = !!productId && params.get("variants") === "1";
  const currency = useTeamCurrency();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const detailsQuery = trpc.products.details.useQuery(
    { id: productId as any },
    { enabled: open, staleTime: 30_000 }
  );
  const product = detailsQuery.data?.product as any;
  const variants = (detailsQuery.data?.variants as any[]) || [];

  const close = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("variants");
    router.replace(url.pathname + url.search);
  };

  const variantCreate = trpc.products.variantCreate.useMutation({
    onSuccess: async () => {
      toast({ description: "Variant added" });
      await detailsQuery.refetch();
    },
    onError: (e) => toast({ description: e.message, variant: "destructive" }),
  });
  const variantUpdate = trpc.products.variantUpdate.useMutation({
    onSuccess: async () => {
      toast({ description: "Variant updated" });
    },
    onError: (e) => toast({ description: e.message, variant: "destructive" }),
  });
  const variantDelete = trpc.products.variantDelete.useMutation({
    onSuccess: async () => {
      toast({ description: "Variant deleted" });
      await detailsQuery.refetch();
    },
    onError: (e) => toast({ description: e.message, variant: "destructive" }),
  });

  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newPrice, setNewPrice] = useState<string>("");
  const [newStatus, setNewStatus] = useState<"active" | "draft" | "archived">("active");

  type Edit = {
    name?: string | null;
    sku?: string | null;
    price?: number | null;
    status?: "active" | "draft" | "archived";
  };
  const [edits, setEdits] = useState<Record<string, Edit>>({});

  const addVariant = async () => {
    if (!productId) return;
    await variantCreate.mutateAsync({
      productId,
      name: newName || null,
      sku: newSku || null,
      price: newPrice ? Number(newPrice) : null,
      currency,
      fulfillmentType: "stocked",
      status: newStatus,
    } as any);
    setNewName("");
    setNewSku("");
    setNewPrice("");
    setNewStatus("active");
    await detailsQuery.refetch();
  };

  return (
    <Sheet onOpenChange={(v) => !v && close()} open={open}>
      <SheetContent className="flex flex-col overflow-hidden p-0 sm:max-w-[780px]">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>Manage variants{product?.name ? ` · ${product.name}` : ""}</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>New variant name</Label>
                <Input onChange={(e) => setNewName(e.target.value)} value={newName} />
              </div>
              <div>
                <Label>SKU</Label>
                <Input onChange={(e) => setNewSku(e.target.value)} value={newSku} />
              </div>
              <div>
                <Label>Price ({currency})</Label>
                <Input
                  onChange={(e) => setNewPrice(e.target.value)}
                  step="0.01"
                  type="number"
                  value={newPrice}
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label>Status</Label>
                  <Select onValueChange={(v) => setNewStatus(v as any)} value={newStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button disabled={variantCreate.isPending} onClick={addVariant}>
                  Add
                </Button>
              </div>
            </div>

            <VariantsList
              currency={currency}
              edits={edits}
              onChangeEdits={setEdits}
              onDelete={async (id) => {
                await variantDelete.mutateAsync({ id });
              }}
              onSave={async (id, patch) => {
                await variantUpdate.mutateAsync({ id, ...patch } as any);
                setEdits((p) => ({ ...p, [id]: {} }));
                await detailsQuery.refetch();
              }}
              variants={variants}
            />
          </div>
        </div>
        <SheetFooter className="border-t px-6 py-4">
          <Button onClick={close} type="button" variant="outline">
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type VariantEdit = {
  name?: string | null;
  sku?: string | null;
  price?: number | null;
  status?: "active" | "draft" | "archived";
};

function VariantsList({
  variants,
  currency,
  edits,
  onChangeEdits,
  onSave,
  onDelete,
}: {
  variants: any[];
  currency: string;
  edits: Record<string, VariantEdit>;
  onChangeEdits: (fn: (prev: Record<string, VariantEdit>) => Record<string, VariantEdit>) => void;
  onSave: (id: string, patch: VariantEdit) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const effectiveSku = (v: any) => (edits[v.id]?.sku ?? v.sku) as string | undefined;
  const skuCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of variants) {
      const s = (effectiveSku(v) || "").trim();
      if (!s) continue;
      map.set(s, (map.get(s) || 0) + 1);
    }
    return map;
  }, [variants, edits]);

  return (
    <div className="divide-y">
      {variants.map((v) => {
        const e = edits[v.id] || {};
        const sku = effectiveSku(v) || "";
        const dup = sku && (skuCounts.get(sku) || 0) > 1;
        return (
          <div className="grid grid-cols-12 items-center gap-2 py-2" key={v.id}>
            <div className="col-span-3">
              <Input
                onChange={(ev) =>
                  onChangeEdits((prev) => ({
                    ...prev,
                    [v.id]: { ...prev[v.id], name: ev.target.value || null },
                  }))
                }
                placeholder="Name"
                value={e.name ?? (v.name || "")}
              />
            </div>
            <div className="col-span-3">
              <Input
                onChange={(ev) =>
                  onChangeEdits((prev) => ({
                    ...prev,
                    [v.id]: { ...prev[v.id], sku: ev.target.value || null },
                  }))
                }
                placeholder="SKU"
                value={e.sku ?? (v.sku || "")}
              />
              {dup ? <div className="mt-1 text-[10px] text-destructive">Duplicate SKU</div> : null}
            </div>
            <div className="col-span-2">
              <Input
                onChange={(ev) =>
                  onChangeEdits((prev) => ({
                    ...prev,
                    [v.id]: {
                      ...prev[v.id],
                      price: ev.target.value ? Number(ev.target.value) : null,
                    },
                  }))
                }
                placeholder={`Price (${currency})`}
                step="0.01"
                type="number"
                value={(e.price ?? (v.price as any as number) ?? "") as any}
              />
            </div>
            <div className="col-span-2">
              <Select
                onValueChange={(val) =>
                  onChangeEdits((prev) => ({
                    ...prev,
                    [v.id]: { ...prev[v.id], status: val as any },
                  }))
                }
                value={(e.status ?? v.status) as any}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <Button
                disabled={!Object.keys(e).length}
                onClick={() => onSave(v.id, e)}
                size="sm"
                variant="secondary"
              >
                Save
              </Button>
              <Button onClick={() => onDelete(v.id)} size="sm" variant="destructive">
                Delete
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
