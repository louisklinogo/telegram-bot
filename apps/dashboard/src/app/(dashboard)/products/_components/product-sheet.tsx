"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { useToast } from "@/components/ui/use-toast";
import { SubmitButton } from "@/components/ui/submit-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ComboboxItem } from "@/components/ui/combobox-dropdown";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Image from "next/image";
import dynamic from "next/dynamic";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  status: z.enum(["active", "draft", "archived"]),
  type: z.enum(["physical", "service", "digital", "bundle"]),
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
  const { toast } = useToast();

  const close = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("new");
    url.searchParams.delete("productId");
    router.replace(url.pathname + url.search);
  };

  const detailsQuery = trpc.products.details.useQuery(
    { id: productId as any },
    {
      enabled: !!productId,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );
  const product = detailsQuery.data?.product || null;
  const { data: categoriesTree = [] } = trpc.productCategories.list.useQuery(
    undefined,
    { staleTime: 600_000, refetchOnWindowFocus: false, refetchOnReconnect: false },
  );

  const form = useForm<FormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      status: "active",
      type: "physical",
      description: "",
      variant: undefined,
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        status: product.status,
        type: product.type,
        categorySlug: product.categorySlug ?? undefined,
        description: product.description ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, Boolean(product)]);

  const utils = trpc.useUtils();
  const create = trpc.products.create.useMutation({
    onSuccess: async () => {
      toast({ description: "Product created" });
      await utils.products.list.invalidate();
    },
    onError: (e) => toast({ description: e.message, variant: "destructive" }),
  });
  const update = trpc.products.update.useMutation({
    onSuccess: async () => {
      toast({ description: "Product updated" });
      await utils.products.list.invalidate();
    },
    onError: (e) => toast({ description: e.message, variant: "destructive" }),
  });
  const [openSections, setOpenSections] = useState<string[]>(["general"]);
  const mediaEnabled = openSections.includes("media");
  const { data: media = [], refetch: refetchMedia } = trpc.products.mediaList.useQuery({ productId: productId as any }, { enabled: mediaEnabled && !!productId });
  const mediaAdd = trpc.products.mediaAdd.useMutation({
    onSuccess: async () => {
      toast({ description: "Media added" });
      await refetchMedia();
    },
    onError: (e) => toast({ description: e.message, variant: "destructive" }),
  });
  const mediaAddMany = trpc.products.mediaAddMany.useMutation({
    onSuccess: async () => {
      toast({ description: "Media added" });
      await refetchMedia();
    },
    onError: (e) => toast({ description: e.message, variant: "destructive" }),
  });
  const mediaDelete = trpc.products.mediaDelete.useMutation({
    onSuccess: async () => {
      toast({ description: "Media deleted" });
      await refetchMedia();
    },
    onError: (e) => toast({ description: e.message, variant: "destructive" }),
  });
  const mediaSetPrimary = trpc.products.mediaSetPrimary.useMutation({
    onSuccess: async () => {
      toast({ description: "Primary set" });
      await refetchMedia();
    },
    onError: (e) => toast({ description: e.message, variant: "destructive" }),
  });
  const mediaUpdate = trpc.products.mediaUpdate.useMutation({
    onSuccess: async () => {
      toast({ description: "Media updated" });
      await refetchMedia();
    },
    onError: (e) => toast({ description: e.message, variant: "destructive" }),
  });
  const mediaReorder = trpc.products.mediaReorder.useMutation({
    onSuccess: async () => {
      await refetchMedia();
    },
    onError: (e) => toast({ description: e.message, variant: "destructive" }),
  });
  const [newMediaPath, setNewMediaPath] = useState("");
  const [newMediaAlt, setNewMediaAlt] = useState("");
  const [mediaLocal, setMediaLocal] = useState<any[]>([]);
  const dragIndex = useRef<number | null>(null);
  useEffect(() => {
    setMediaLocal(media as any[]);
  }, [media]);
  const [stagedFiles, setStagedFiles] = useState<Array<{ file: File; preview: string; alt?: string }>>([]);
  const addStagedFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    setStagedFiles((prev) => [
      ...prev,
      ...arr.map((f) => ({ file: f, preview: URL.createObjectURL(f), alt: "" })),
    ]);
  };
  const removeStagedAt = (idx: number) => setStagedFiles((p) => p.filter((_, i) => i !== idx));

  const uploadAndAttach = async (pid: string, files: Array<{ file: File; alt?: string }>) => {
    if (!files.length) return;
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const { createBrowserClient } = await import("@Faworra/supabase/client");
    const supabase = createBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || "";
    const uploaded: Array<{ path: string; alt?: string; isPrimary?: boolean }> = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const fd = new FormData();
      fd.append("file", f.file);
      fd.append("productId", pid);
      const resp = await fetch(`${base}/products/uploads`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || "Upload failed");
      uploaded.push({ path: json.path as string, alt: f.alt, isPrimary: i === 0 });
    }
    // Batch attach
    await mediaAddMany.mutateAsync({ productId: pid as any, items: uploaded } as any);
  };

  const addViaUrl = async (pid: string, url: string, alt?: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const { createBrowserClient } = await import("@Faworra/supabase/client");
    const supabase = createBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || "";
    const resp = await fetch(`${base}/products/uploads/url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ productId: pid, url }),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.error || "URL import failed");
    await mediaAdd.mutateAsync({ productId: pid as any, path: json.path as string, alt });
  };

  const toStoragePath = (input: string) => {
    try {
      const m = input.match(/\/storage\/v1\/object\/public\/product-media\/(.+)$/);
      return m ? m[1] : input;
    } catch {
      return input;
    }
  };

  const supabasePublicUrlFor = (path: string) => {
    if (!path) return path;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return base ? `${base}/storage/v1/object/public/product-media/${path}` : path;
  };

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
        if (pid && stagedFiles.length) {
          await uploadAndAttach(pid, stagedFiles.map(({ file, alt }) => ({ file, alt })));
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
      if (productId) {
        await utils.products.details.invalidate({ id: productId as any });
      }
      await utils.products.mediaList.invalidate();
      close();
    } catch (e: any) {
      toast({ description: String(e?.message || e), variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && close()}>
      <SheetContent className="sm:max-w-[650px] p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>{productId ? "Edit product" : "Add product"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 min-h-0 flex-col">
          <ScrollArea className="flex-1 px-6 py-4">
          <Accordion type="multiple" value={openSections} onValueChange={(v) => setOpenSections(v as string[])} className="space-y-3">
            <AccordionItem value="general">
              <AccordionTrigger>General</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" {...form.register("name")} />
                    {form.formState.errors.name && (
                      <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message as any}</p>
                    )}
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
                    <CategoryPicker
                      categories={categoriesTree as any}
                      value={form.watch("categorySlug") || ""}
                      onChange={(slug) => form.setValue("categorySlug", slug || undefined)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Description</Label>
                    <Textarea rows={4} {...form.register("description")} />
                  </div>
                  {productId ? (
                    <div className="col-span-2 flex justify-end">
                      <Button type="button" variant="outline" onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set("productId", productId!);
                        url.searchParams.set("variants", "1");
                        router.replace(url.pathname + url.search);
                      }}>Manage variants</Button>
                    </div>
                  ) : null}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="media">
              <AccordionTrigger>Media</AccordionTrigger>
              <AccordionContent>
                {mediaEnabled ? (
                  <div className="space-y-3">
                    {productId ? (
                      <>
                        <div
                          className="grid grid-cols-1 gap-3"
                          role="list"
                          onDragOver={(e) => e.preventDefault()}
                        >
                          {mediaLocal.map((m, idx) => (
                            <div
                              key={m.id}
                              className="flex items-center gap-3 border rounded p-2"
                              draggable
                              onDragStart={() => { dragIndex.current = idx; }}
                              onDragEnter={(e) => {
                                e.preventDefault();
                                const from = dragIndex.current;
                                if (from == null || from === idx) return;
                                setMediaLocal((prev) => {
                                  const next = prev.slice();
                                  const [item] = next.splice(from, 1);
                                  next.splice(idx, 0, item);
                                  dragIndex.current = idx;
                                  return next;
                                });
                              }}
                              onDragEnd={async () => {
                                if (!productId) return;
                                try {
                                  const order = mediaLocal.map((x) => x.id);
                                  await mediaReorder.mutateAsync({ productId: productId as any, order });
                                  await refetchMedia();
                                } finally {
                                  dragIndex.current = null;
                                }
                              }}
                            >
                              <div className="relative">
                                <Image src={supabasePublicUrlFor(m.path)} alt={m.alt || ""} width={56} height={56} className="h-14 w-14 rounded object-cover" />
                                {m.isPrimary ? (
                                  <span className="absolute -top-1 -right-1 text-[10px] px-1 py-0.5 rounded bg-secondary border">Primary</span>
                                ) : null}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs truncate text-muted-foreground">{m.path}</div>
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={m.alt || ""}
                                    onBlur={async (e) => {
                                      if (e.target.value !== (m.alt || "")) {
                                        await mediaUpdate.mutateAsync({ id: m.id, alt: e.target.value });
                                      }
                                    }}
                                    placeholder="Alt text"
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant={m.isPrimary ? "secondary" : "outline"} disabled={mediaSetPrimary.isPending} onClick={async () => { await mediaSetPrimary.mutateAsync({ id: m.id }); }}>Set primary</Button>
                                <Button size="sm" variant="outline" disabled={mediaReorder.isPending || idx === 0} onClick={async () => {
                                  if (!productId) return;
                                  const order = mediaLocal.map((x) => x.id);
                                  [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
                                  await mediaReorder.mutateAsync({ productId: productId as any, order });
                                  await refetchMedia();
                                }}>Up</Button>
                                <Button size="sm" variant="outline" disabled={mediaReorder.isPending || idx === (mediaLocal.length - 1)} onClick={async () => {
                                  if (!productId) return;
                                  const order = mediaLocal.map((x) => x.id);
                                  [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
                                  await mediaReorder.mutateAsync({ productId: productId as any, order });
                                  await refetchMedia();
                                }}>Down</Button>
                                <Button size="sm" variant="destructive" disabled={mediaDelete.isPending} onClick={async () => { await mediaDelete.mutateAsync({ id: m.id }); }}>Delete</Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <Label>Upload files</Label>
                            <DropzoneUpload onDrop={async (files) => {
                              if (!productId) return;
                              await uploadAndAttach(productId, files.map((file) => ({ file })));
                              await refetchMedia();
                              toast({ description: `Uploaded ${files.length} file${files.length>1?"s":""}` });
                            }} />
                          </div>
                          <div>
                            <Label>URL</Label>
                            <Input value={newMediaPath} onChange={(e) => setNewMediaPath(e.target.value)} placeholder="https://..." />
                          </div>
                          <div>
                            <Label>Alt</Label>
                            <Input value={newMediaAlt} onChange={(e) => setNewMediaAlt(e.target.value)} />
                          </div>
                          <div className="col-span-2 flex justify-end">
                            <Button type="button" disabled={mediaAdd.isPending} onClick={async () => { if (!newMediaPath) return; await addViaUrl(productId as string, newMediaPath, newMediaAlt); setNewMediaPath(""); setNewMediaAlt(""); await refetchMedia(); toast({ description: "Media added" }); }}>Add from URL</Button>
                          </div>
                        </div>
                      </>
                    ) : null}

                    {!productId ? (
                      <div className="space-y-2">
                        <div>
                          <Label>Upload files (staged until Create)</Label>
                          <DropzoneUpload onDrop={(files) => addStagedFiles(files)} />
                        </div>
                        {stagedFiles.length > 0 ? (
                          <div className="space-y-2">
                            {stagedFiles.map((s, idx) => (
                              <div key={idx} className="flex items-center gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={s.preview} alt="preview" className="h-12 w-12 rounded object-cover" />
                                <Input
                                  value={s.alt || ""}
                                  onChange={(e) => setStagedFiles((p) => p.map((x, i) => (i === idx ? { ...x, alt: e.target.value } : x)))}
                                  placeholder="Alt text"
                                  className="h-8 text-xs flex-1"
                                />
                                <Button size="sm" variant="ghost" onClick={() => removeStagedAt(idx)}>Remove</Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">No files staged yet.</div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Open to manage media.</div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          </ScrollArea>
          <SheetFooter className="px-6 py-4 border-t">
            <Button type="button" variant="outline" onClick={close} disabled={create.isPending || update.isPending}>Cancel</Button>
            <SubmitButton type="submit" isSubmitting={create.isPending || update.isPending}>
              {productId ? "Save" : "Create"}
            </SubmitButton>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
const DropzoneUpload = dynamic(() => import("./dropzone-upload").then((m) => m.DropzoneUpload), {
  ssr: false,
  loading: () => null,
});


// Inventory editor moved to Variants Manager

// Category picker matching Transactions UX (hierarchical with colors/indent)
const ComboboxDropdownLazy = dynamic(() => import("@/components/ui/combobox-dropdown").then((m) => m.ComboboxDropdown), { ssr: false, loading: () => null });

function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: Array<{ id: string; name: string; slug: string; color?: string | null; children?: any[] }>;
  value: string;
  onChange: (slug: string) => void;
}) {
  type Node = { id: string; name: string; slug: string; color?: string | null; children?: Node[] };
  const utils = trpc.useUtils();
  const createCategory = trpc.productCategories.create.useMutation();
  const flatten = (nodes: Node[], depth = 0): Array<Node & { depth: number }> => {
    const out: Array<Node & { depth: number }> = [];
    for (const n of nodes) {
      out.push({ ...n, depth });
      if (n.children && n.children.length) out.push(...flatten(n.children, depth + 1));
    }
    return out;
  };
  const items = useMemo(() => {
    return flatten((categories as Node[]) || []).map((c) => ({
      id: c.slug,
      label: c.name,
      depth: c.depth,
      color: c.color || undefined,
    })) as Array<ComboboxItem & { depth: number; color?: string }>;
  }, [categories]);

  const selected = value ? (items.find((i) => i.id === value) as ComboboxItem | undefined) : undefined;

  return (
    <ComboboxDropdownLazy
      items={items}
      selectedItem={selected}
      onSelect={(item) => onChange(item?.id || "")}
      placeholder="Select category"
      searchPlaceholder="Search category"
      onCreate={async (name) => {
        const row = await createCategory.mutateAsync({ name });
        await utils.productCategories.list.invalidate();
        onChange(row.slug);
      }}
      renderListItem={({ isChecked, item }) => (
        <div className="flex items-center gap-2 w-full">
          <span style={{ paddingLeft: `${(item as any).depth * 12}px` }} />
          <span className="inline-block h-3 w-3 rounded-sm border" style={{ backgroundColor: ((item as any).color as string) || "#e5e7eb" }} />
          <span className="flex-1 truncate">{item.label}</span>
          {isChecked ? <span className="text-xs">Selected</span> : null}
        </div>
      )}
      renderSelectedItem={(sel) => (
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm border" style={{ backgroundColor: ((sel as any).color as string) || "#e5e7eb" }} />
          <span className="truncate">{sel.label}</span>
        </span>
      )}
    />
  );
}
