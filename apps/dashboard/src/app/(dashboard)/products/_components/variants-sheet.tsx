"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@Faworra/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeamCurrency } from "@/hooks/use-team-currency";
import { useToast } from "@/components/ui/use-toast";

export function VariantsSheet() {
  const router = useRouter();
  const params = useSearchParams();
  const productId = params.get("productId");
  const open = !!productId && params.get("variants") === "1";
  const currency = useTeamCurrency();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const detailsQuery = trpc.products.details.useQuery({ id: productId as any }, { enabled: open, staleTime: 30_000 });
  const product = detailsQuery.data?.product as any;
  const variants = (detailsQuery.data?.variants as any[]) || [];

  const close = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("variants");
    router.replace(url.pathname + url.search);
  };

  const variantCreate = trpc.products.variantCreate.useMutation({
    onSuccess: async () => { toast({ description: "Variant added" }); await detailsQuery.refetch(); },
    onError: (e) => toast({ description: e.message, variant: "destructive" }),
  });
  const variantUpdate = trpc.products.variantUpdate.useMutation({
    onSuccess: async () => { toast({ description: "Variant updated" }); },
    onError: (e) => toast({ description: e.message, variant: "destructive" }),
  });
  const variantDelete = trpc.products.variantDelete.useMutation({
    onSuccess: async () => { toast({ description: "Variant deleted" }); await detailsQuery.refetch(); },
    onError: (e) => toast({ description: e.message, variant: "destructive" }),
  });

  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newPrice, setNewPrice] = useState<string>("");
  const [newStatus, setNewStatus] = useState<"active" | "draft" | "archived">("active");

  type Edit = { name?: string | null; sku?: string | null; price?: number | null; status?: "active" | "draft" | "archived" };
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
    setNewName(""); setNewSku(""); setNewPrice(""); setNewStatus("active");
    await detailsQuery.refetch();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && close()}>
      <SheetContent className="sm:max-w-[780px] p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>Manage variants{product?.name ? ` · ${product.name}` : ""}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 min-h-0 overflow-auto px-6 py-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>New variant name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div>
                <Label>SKU</Label>
                <Input value={newSku} onChange={(e) => setNewSku(e.target.value)} />
              </div>
              <div>
                <Label>Price ({currency})</Label>
                <Input type="number" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label>Status</Label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as any)}>
                    <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addVariant} disabled={variantCreate.isPending}>Add</Button>
              </div>
            </div>

            <VariantsList
              variants={variants}
              currency={currency}
              edits={edits}
              onChangeEdits={setEdits}
              onSave={async (id, patch) => {
                await variantUpdate.mutateAsync({ id, ...patch } as any);
                setEdits((p) => ({ ...p, [id]: {} }));
                await detailsQuery.refetch();
              }}
              onDelete={async (id) => { await variantDelete.mutateAsync({ id }); }}
            />
          </div>
        </div>
        <SheetFooter className="px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={close}>Close</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type VariantEdit = { name?: string | null; sku?: string | null; price?: number | null; status?: "active" | "draft" | "archived" };

function VariantsList({ variants, currency, edits, onChangeEdits, onSave, onDelete }: {
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
          <div key={v.id} className="grid grid-cols-12 gap-2 items-center py-2">
            <div className="col-span-3">
              <Input
                value={e.name ?? (v.name || "")}
                onChange={(ev) => onChangeEdits((prev) => ({ ...prev, [v.id]: { ...prev[v.id], name: ev.target.value || null } }))}
                placeholder="Name"
              />
            </div>
            <div className="col-span-3">
              <Input
                value={e.sku ?? (v.sku || "")}
                onChange={(ev) => onChangeEdits((prev) => ({ ...prev, [v.id]: { ...prev[v.id], sku: ev.target.value || null } }))}
                placeholder="SKU"
              />
              {dup ? <div className="text-[10px] text-destructive mt-1">Duplicate SKU</div> : null}
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                step="0.01"
                value={(e.price ?? (v.price as any as number) ?? "") as any}
                onChange={(ev) => onChangeEdits((prev) => ({ ...prev, [v.id]: { ...prev[v.id], price: ev.target.value ? Number(ev.target.value) : null } }))}
                placeholder={`Price (${currency})`}
              />
            </div>
            <div className="col-span-2">
              <Select value={(e.status ?? v.status) as any} onValueChange={(val) => onChangeEdits((prev) => ({ ...prev, [v.id]: { ...prev[v.id], status: val as any } }))}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => onSave(v.id, e)} disabled={!Object.keys(e).length}>Save</Button>
              <Button size="sm" variant="destructive" onClick={() => onDelete(v.id)}>Delete</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
