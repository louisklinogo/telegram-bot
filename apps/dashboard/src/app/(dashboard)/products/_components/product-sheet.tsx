"use client";

import { Label } from "@Faworra/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { ComboboxItem } from "@/components/ui/combobox-dropdown";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useTeamCurrency } from "@/hooks/use-team-currency";
import { trpc } from "@/lib/trpc/client";

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
    }
  );
  const product = detailsQuery.data?.product || null;
  const { data: categoriesTree = [] } = trpc.productCategories.list.useQuery(undefined, {
    staleTime: 600_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

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
  const { data: media = [], refetch: refetchMedia } = trpc.products.mediaList.useQuery(
    { productId: productId as any },
    { enabled: mediaEnabled && !!productId }
  );
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
  const [stagedFiles, setStagedFiles] = useState<
    Array<{ file: File; preview: string; alt?: string }>
  >([]);
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
    const {
      data: { session },
    } = await supabase.auth.getSession();
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
    const {
      data: { session },
    } = await supabase.auth.getSession();
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
      if (productId) {
        await update.mutateAsync({
          id: productId,
          name: data.name,
          status: data.status,
          type: data.type,
          categorySlug: data.categorySlug,
          description: data.description,
        } as any);
      } else {
        const created = await create.mutateAsync({
          name: data.name,
          status: data.status,
          type: data.type,
          categorySlug: data.categorySlug,
          description: data.description,
        } as any);
        const pid = (created as any)?.id as string;
        if (pid && stagedFiles.length) {
          await uploadAndAttach(
            pid,
            stagedFiles.map(({ file, alt }) => ({ file, alt }))
          );
        }
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
    <Sheet onOpenChange={(v) => !v && close()} open={open}>
      <SheetContent className="flex flex-col overflow-hidden p-0 sm:max-w-[650px]">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>{productId ? "Edit product" : "Add product"}</SheetTitle>
        </SheetHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(onSubmit)}>
          <ScrollArea className="flex-1 px-6 py-4">
            <Accordion
              className="space-y-3"
              onValueChange={(v) => setOpenSections(v as string[])}
              type="multiple"
              value={openSections}
            >
              <AccordionItem value="general">
                <AccordionTrigger>General</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" {...form.register("name")} />
                      {form.formState.errors.name && (
                        <p className="mt-1 text-destructive text-xs">
                          {form.formState.errors.name.message as any}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select
                        onValueChange={(v) => form.setValue("status", v as any)}
                        value={form.watch("status")}
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
                    <div>
                      <Label>Type</Label>
                      <Select
                        onValueChange={(v) => form.setValue("type", v as any)}
                        value={form.watch("type")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
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
                        onChange={(slug) => form.setValue("categorySlug", slug || undefined)}
                        value={form.watch("categorySlug") || ""}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Description</Label>
                      <Textarea rows={4} {...form.register("description")} />
                    </div>
                    {productId ? (
                      <div className="col-span-2 flex justify-end">
                        <Button
                          onClick={() => {
                            const url = new URL(window.location.href);
                            url.searchParams.set("productId", productId!);
                            url.searchParams.set("variants", "1");
                            router.replace(url.pathname + url.search);
                          }}
                          type="button"
                          variant="outline"
                        >
                          Manage variants
                        </Button>
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
                            onDragOver={(e) => e.preventDefault()}
                            role="list"
                          >
                            {mediaLocal.map((m, idx) => (
                              <div
                                className="flex items-center gap-3 rounded border p-2"
                                draggable
                                key={m.id}
                                onDragEnd={async () => {
                                  if (!productId) return;
                                  try {
                                    const order = mediaLocal.map((x) => x.id);
                                    await mediaReorder.mutateAsync({
                                      productId: productId as any,
                                      order,
                                    });
                                    await refetchMedia();
                                  } finally {
                                    dragIndex.current = null;
                                  }
                                }}
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
                                onDragStart={() => {
                                  dragIndex.current = idx;
                                }}
                              >
                                <div className="relative">
                                  <Image
                                    alt={m.alt || ""}
                                    className="h-14 w-14 rounded object-cover"
                                    height={56}
                                    src={supabasePublicUrlFor(m.path)}
                                    width={56}
                                  />
                                  {m.isPrimary ? (
                                    <span className="-top-1 -right-1 absolute rounded border bg-secondary px-1 py-0.5 text-[10px]">
                                      Primary
                                    </span>
                                  ) : null}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-muted-foreground text-xs">
                                    {m.path}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      className="h-8 text-xs"
                                      onBlur={async (e) => {
                                        if (e.target.value !== (m.alt || "")) {
                                          await mediaUpdate.mutateAsync({
                                            id: m.id,
                                            alt: e.target.value,
                                          });
                                        }
                                      }}
                                      placeholder="Alt text"
                                      value={m.alt || ""}
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    disabled={mediaSetPrimary.isPending}
                                    onClick={async () => {
                                      await mediaSetPrimary.mutateAsync({ id: m.id });
                                    }}
                                    size="sm"
                                    variant={m.isPrimary ? "secondary" : "outline"}
                                  >
                                    Set primary
                                  </Button>
                                  <Button
                                    disabled={mediaReorder.isPending || idx === 0}
                                    onClick={async () => {
                                      if (!productId) return;
                                      const order = mediaLocal.map((x) => x.id);
                                      [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
                                      await mediaReorder.mutateAsync({
                                        productId: productId as any,
                                        order,
                                      });
                                      await refetchMedia();
                                    }}
                                    size="sm"
                                    variant="outline"
                                  >
                                    Up
                                  </Button>
                                  <Button
                                    disabled={
                                      mediaReorder.isPending || idx === mediaLocal.length - 1
                                    }
                                    onClick={async () => {
                                      if (!productId) return;
                                      const order = mediaLocal.map((x) => x.id);
                                      [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
                                      await mediaReorder.mutateAsync({
                                        productId: productId as any,
                                        order,
                                      });
                                      await refetchMedia();
                                    }}
                                    size="sm"
                                    variant="outline"
                                  >
                                    Down
                                  </Button>
                                  <Button
                                    disabled={mediaDelete.isPending}
                                    onClick={async () => {
                                      await mediaDelete.mutateAsync({ id: m.id });
                                    }}
                                    size="sm"
                                    variant="destructive"
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                              <Label>Upload files</Label>
                              <DropzoneUpload
                                onDrop={async (files) => {
                                  if (!productId) return;
                                  await uploadAndAttach(
                                    productId,
                                    files.map((file) => ({ file }))
                                  );
                                  await refetchMedia();
                                  toast({
                                    description: `Uploaded ${files.length} file${files.length > 1 ? "s" : ""}`,
                                  });
                                }}
                              />
                            </div>
                            <div>
                              <Label>URL</Label>
                              <Input
                                onChange={(e) => setNewMediaPath(e.target.value)}
                                placeholder="https://..."
                                value={newMediaPath}
                              />
                            </div>
                            <div>
                              <Label>Alt</Label>
                              <Input
                                onChange={(e) => setNewMediaAlt(e.target.value)}
                                value={newMediaAlt}
                              />
                            </div>
                            <div className="col-span-2 flex justify-end">
                              <Button
                                disabled={mediaAdd.isPending}
                                onClick={async () => {
                                  if (!newMediaPath) return;
                                  await addViaUrl(productId as string, newMediaPath, newMediaAlt);
                                  setNewMediaPath("");
                                  setNewMediaAlt("");
                                  await refetchMedia();
                                  toast({ description: "Media added" });
                                }}
                                type="button"
                              >
                                Add from URL
                              </Button>
                            </div>
                          </div>
                        </>
                      ) : null}

                      {productId ? null : (
                        <div className="space-y-2">
                          <div>
                            <Label>Upload files (staged until Create)</Label>
                            <DropzoneUpload onDrop={(files) => addStagedFiles(files)} />
                          </div>
                          {stagedFiles.length > 0 ? (
                            <div className="space-y-2">
                              {stagedFiles.map((s, idx) => (
                                <div className="flex items-center gap-3" key={idx}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    alt="preview"
                                    className="h-12 w-12 rounded object-cover"
                                    src={s.preview}
                                  />
                                  <Input
                                    className="h-8 flex-1 text-xs"
                                    onChange={(e) =>
                                      setStagedFiles((p) =>
                                        p.map((x, i) =>
                                          i === idx ? { ...x, alt: e.target.value } : x
                                        )
                                      )
                                    }
                                    placeholder="Alt text"
                                    value={s.alt || ""}
                                  />
                                  <Button
                                    onClick={() => removeStagedAt(idx)}
                                    size="sm"
                                    variant="ghost"
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-muted-foreground text-sm">
                              No files staged yet.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm">Open to manage media.</div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </ScrollArea>
          <SheetFooter className="border-t px-6 py-4">
            <Button
              disabled={create.isPending || update.isPending}
              onClick={close}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <SubmitButton isSubmitting={create.isPending || update.isPending} type="submit">
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
const ComboboxDropdownLazy = dynamic(
  () => import("@/components/ui/combobox-dropdown").then((m) => m.ComboboxDropdown),
  { ssr: false, loading: () => null }
);

function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    color?: string | null;
    children?: any[];
  }>;
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
  const items = useMemo(
    () =>
      flatten((categories as Node[]) || []).map((c) => ({
        id: c.slug,
        label: c.name,
        depth: c.depth,
        color: c.color || undefined,
      })) as Array<ComboboxItem & { depth: number; color?: string }>,
    [categories]
  );

  const selected = value
    ? (items.find((i) => i.id === value) as ComboboxItem | undefined)
    : undefined;

  return (
    <ComboboxDropdownLazy
      items={items}
      onCreate={async (name) => {
        const row = await createCategory.mutateAsync({ name });
        await utils.productCategories.list.invalidate();
        onChange(row.slug);
      }}
      onSelect={(item) => onChange(item?.id || "")}
      placeholder="Select category"
      renderListItem={({ isChecked, item }) => (
        <div className="flex w-full items-center gap-2">
          <span style={{ paddingLeft: `${(item as any).depth * 12}px` }} />
          <span
            className="inline-block h-3 w-3 rounded-sm border"
            style={{ backgroundColor: ((item as any).color as string) || "#e5e7eb" }}
          />
          <span className="flex-1 truncate">{item.label}</span>
          {isChecked ? <span className="text-xs">Selected</span> : null}
        </div>
      )}
      renderSelectedItem={(sel) => (
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-sm border"
            style={{ backgroundColor: ((sel as any).color as string) || "#e5e7eb" }}
          />
          <span className="truncate">{sel.label}</span>
        </span>
      )}
      searchPlaceholder="Search category"
      selectedItem={selected}
    />
  );
}
