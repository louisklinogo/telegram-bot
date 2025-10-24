"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc/client";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@Faworra/ui/label";
import { useTeamCurrency } from "@/hooks/use-team-currency";

const productSchema = z.object({
  name: z.string().min(1),
  status: z.enum(["active", "draft", "archived"]).default("active"),
  type: z.enum(["physical", "service", "digital", "bundle"]).default("physical"),
  categorySlug: z.string().optional(),
  description: z.string().optional(),
  // Optional initial variant
  variant: z
    .object({
      name: z.string().optional(),
      sku: z.string().optional(),
      price: z.number().optional(),
      currency: z.string().optional(),
      fulfillmentType: z.enum(["stocked", "dropship", "made_to_order", "preorder"]).optional(),
      stockManaged: z.boolean().optional(),
      leadTimeDays: z.number().optional(),
    })
    .optional(),
});

type FormData = z.infer<typeof productSchema>;

export function ProductSheet() {
  const router = useRouter();
  const params = useSearchParams();
  const openNew = params.get("new") === "1";
  const productId = params.get("productId");
  const open = openNew || !!productId;
  const currency = useTeamCurrency();

  const close = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("new");
    url.searchParams.delete("productId");
    router.replace(url.pathname + (url.search ? `?${url.searchParams}` : ""));
  };

  const { data: product } = trpc.products.byId.useQuery(
    { id: productId as any },
    { enabled: !!productId },
  );
  const { data: categories = [] } = trpc.transactionCategories.list.useQuery(undefined, { staleTime: 60_000 });

  const form = useForm<FormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      status: "active",
      type: "physical",
      description: "",
      variant: { currency },
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: (product as any).name,
        status: (product as any).status,
        type: (product as any).type,
        categorySlug: (product as any).categorySlug ?? undefined,
        description: (product as any).description ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, Boolean(product)]);

  const create = trpc.products.create.useMutation();
  const update = trpc.products.update.useMutation();
  const variantCreate = trpc.products.variantCreate.useMutation();
  const variantUpdate = trpc.products.variantUpdate.useMutation();
  const variantDelete = trpc.products.variantDelete.useMutation();
  const { data: variants = [], refetch: refetchVariants } = trpc.products.variantsByProduct.useQuery({ productId: productId as any }, { enabled: !!productId });
  const { data: locations = [] } = trpc.products.inventoryLocations.useQuery(undefined, { enabled: !!productId });
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variantEdits, setVariantEdits] = useState<Record<string, { price?: number | null; status?: string }>>({});
  const utils = trpc.useUtils();

  const onSubmit = async (data: FormData) => {
    try {
      if (!productId) {
        const created = await create.mutateAsync({
          name: data.name,
          status: data.status,
          type: data.type,
          categorySlug: data.categorySlug,
          description: data.description,
        } as any);
        const pid = (created as any)?.id as string;
        if (pid && data.variant && (data.variant.price || data.variant.name || data.variant.sku)) {
          await variantCreate.mutateAsync({
            productId: pid,
            name: data.variant.name || null,
            sku: data.variant.sku || null,
            price: data.variant.price ?? null,
            currency: data.variant.currency || currency,
            fulfillmentType: (data.variant.fulfillmentType as any) || "stocked",
            stockManaged: data.variant.stockManaged ?? true,
            leadTimeDays: data.variant.leadTimeDays ?? null,
          } as any);
        }
      } else {
        await update.mutateAsync({
          id: productId,
          name: data.name,
          status: data.status,
          type: data.type,
          categorySlug: data.categorySlug,
          description: data.description,
        } as any);
      }
      await utils.products.list.invalidate();
      close();
    } catch {}
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && close()}>
      <SheetContent className="w-[680px] sm:w-[720px]">
        <SheetHeader>
          <SheetTitle>{productId ? "Edit product" : "Add product"}</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6 py-4 max-h-[calc(100vh-120px)] overflow-y-auto pr-2"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as any)}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.watch("type")} onValueChange={(v) => form.setValue("type", v as any)}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                  <SelectItem value="bundle">Bundle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Category</Label>
              <Select value={form.watch("categorySlug") || ""} onValueChange={(v) => form.setValue("categorySlug", v || undefined)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {(categories as any[]).map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea rows={4} {...form.register("description")} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">Initial variant (optional)</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Variant name</Label>
                <Input value={form.watch("variant.name") || ""} onChange={(e) => form.setValue("variant.name", e.target.value)} />
              </div>
              <div>
                <Label>SKU</Label>
                <Input value={form.watch("variant.sku") || ""} onChange={(e) => form.setValue("variant.sku", e.target.value)} />
              </div>
              <div>
                <Label>Price ({currency})</Label>
                <Input type="number" step="0.01" value={form.watch("variant.price") as any as string || ""} onChange={(e) => form.setValue("variant.price", e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <div>
                <Label>Fulfillment</Label>
                <Select value={(form.watch("variant.fulfillmentType") as any) || "stocked"} onValueChange={(v) => form.setValue("variant.fulfillmentType", v as any)}>
                  <SelectTrigger><SelectValue placeholder="Fulfillment" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stocked">Stocked</SelectItem>
                    <SelectItem value="dropship">Dropship</SelectItem>
                    <SelectItem value="made_to_order">Made to order</SelectItem>
                    <SelectItem value="preorder">Pre-order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {productId ? (
            <div className="space-y-3">
              <div className="text-sm font-medium">Variants</div>
              <div className="space-y-2">
                {(variants as any[]).map((v) => {
                  const edits = variantEdits[v.id] || {};
                  return (
                    <div key={v.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4 truncate text-sm">{v.name || "(default)"}</div>
                      <div className="col-span-2 text-xs text-muted-foreground">{v.sku || "-"}</div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={(edits.price ?? (v.price as any as number) ?? "") as any}
                          onChange={(e) => setVariantEdits((prev) => ({ ...prev, [v.id]: { ...prev[v.id], price: e.target.value ? Number(e.target.value) : null } }))}
                        />
                      </div>
                      <div className="col-span-1 text-right text-sm">{v.currency || currency}</div>
                      <div className="col-span-2 flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={async () => {
                          await variantUpdate.mutateAsync({ id: v.id, price: (variantEdits[v.id]?.price ?? null) as any });
                          setVariantEdits((p) => ({ ...p, [v.id]: {} }));
                          await refetchVariants();
                        }}>Save</Button>
                        <Button size="sm" variant="destructive" onClick={async () => { await variantDelete.mutateAsync({ id: v.id }); await refetchVariants(); }}>Delete</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>New variant name</Label>
                  <Input value={form.watch("variant.name") || ""} onChange={(e) => form.setValue("variant.name", e.target.value)} />
                </div>
                <div>
                  <Label>New variant SKU</Label>
                  <Input value={form.watch("variant.sku") || ""} onChange={(e) => form.setValue("variant.sku", e.target.value)} />
                </div>
                <div>
                  <Label>New variant price ({currency})</Label>
                  <Input type="number" step="0.01" value={form.watch("variant.price") as any as string || ""} onChange={(e) => form.setValue("variant.price", e.target.value ? Number(e.target.value) : undefined)} />
                </div>
                <div className="flex items-end">
                  <Button type="button" onClick={async () => {
                    if (!productId) return;
                    const v = form.getValues().variant;
                    await variantCreate.mutateAsync({ productId, name: v?.name || null, sku: v?.sku || null, price: (v?.price as any) ?? null, currency, fulfillmentType: (v?.fulfillmentType as any) || "stocked" } as any);
                    form.setValue("variant", { currency });
                    await refetchVariants();
                  }}>Add variant</Button>
                </div>
              </div>
            </div>
          ) : null}

          {productId && (variants as any[]).length ? (
            <InventoryEditor productId={productId!} variants={variants as any[]} />
          ) : null}

          <SheetFooter>
            <Button type="button" variant="outline" onClick={close}>Cancel</Button>
            <Button type="submit">{productId ? "Save" : "Create"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function InventoryEditor({ productId, variants }: { productId: string; variants: any[] }) {
  const [variantId, setVariantId] = useState<string>(variants[0]?.id as string);
  const { data: locations = [] } = trpc.products.inventoryLocations.useQuery();
  const { data: existing = [], refetch } = trpc.products.inventoryByVariant.useQuery({ variantId }, { enabled: !!variantId });
  const upsert = trpc.products.inventoryUpsert.useMutation();

  const byLocation = useMemo(() => {
    const map = new Map<string, { onHand: number; allocated: number; safetyStock: number; name: string }>();
    for (const loc of locations as any[]) map.set(loc.id, { onHand: 0, allocated: 0, safetyStock: 0, name: loc.name });
    for (const row of existing as any[]) {
      if (map.has(row.locationId)) map.set(row.locationId, { onHand: row.onHand, allocated: row.allocated, safetyStock: row.safetyStock, name: row.locationName || map.get(row.locationId)!.name });
    }
    return map;
  }, [locations, existing]);

  const [draft, setDraft] = useState<Record<string, { onHand: number; allocated: number; safetyStock: number }>>({});

  useEffect(() => {
    const initial: Record<string, any> = {};
    for (const [locId, v] of byLocation.entries()) initial[locId] = { onHand: v.onHand, allocated: v.allocated, safetyStock: v.safetyStock };
    setDraft(initial);
  }, [byLocation]);

  const save = async () => {
    const entries = Object.entries(draft).map(([locationId, v]) => ({ locationId, ...v }));
    await upsert.mutateAsync({ variantId, entries } as any);
    await refetch();
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Inventory</div>
      <div>
        <Label>Variant</Label>
        <Select value={variantId} onValueChange={(v) => setVariantId(v)}>
          <SelectTrigger><SelectValue placeholder="Select variant" /></SelectTrigger>
          <SelectContent>
            {variants.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.name || v.sku || "(default)"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        {Array.from(byLocation.entries()).map(([locId, v]) => (
          <div key={locId} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-4 text-sm">{v.name}</div>
            <div className="col-span-2">
              <Input type="number" value={draft[locId]?.onHand ?? 0} onChange={(e) => setDraft((p) => ({ ...p, [locId]: { ...(p[locId] || {}), onHand: Number(e.target.value || 0) } }))} />
            </div>
            <div className="col-span-2">
              <Input type="number" value={draft[locId]?.allocated ?? 0} onChange={(e) => setDraft((p) => ({ ...p, [locId]: { ...(p[locId] || {}), allocated: Number(e.target.value || 0) } }))} />
            </div>
            <div className="col-span-2">
              <Input type="number" value={draft[locId]?.safetyStock ?? 0} onChange={(e) => setDraft((p) => ({ ...p, [locId]: { ...(p[locId] || {}), safetyStock: Number(e.target.value || 0) } }))} />
            </div>
            <div className="col-span-2 text-right">
              <span className="text-xs text-muted-foreground">on hand / allocated / safety</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={save}>Save stock</Button>
      </div>
    </div>
  );
}
