"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useTransactionParams } from "@/hooks/use-transaction-params";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X } from "lucide-react";
import { SelectCategory } from "@/components/select-category";
import { SelectUser } from "@/components/select-user";
import { ComboboxMulti } from "@/components/ui/combobox-multi";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/ui/icons";
import { createBrowserClient } from "@Faworra/supabase/client";
import { useDropzone } from "react-dropzone";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export function TransactionDetailsSheet() {
  const { isOpen, transactionId, close } = useTransactionParams();

  const enabled = Boolean(transactionId);
  const { data, isLoading } = trpc.transactions.byId.useQuery(
    { id: transactionId as string },
    { enabled },
  );
  const utils = trpc.useUtils();

  const { data: accounts = [] } = trpc.transactions.accounts.useQuery(undefined, {
    staleTime: 60_000,
    enabled,
  });
  const { data: categoriesTree = [] } = trpc.transactionCategories.list.useQuery(undefined, {
    staleTime: 60_000,
  });

  const bulkUpdate = trpc.transactions.bulkUpdate.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.transactions.byId.invalidate({ id: transactionId as string }),
        utils.transactions.enrichedList.invalidate(),
      ]);
    },
  });

  if (!transactionId) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent className="sm:max-w-[660px] bg-background p-0">
        <ScrollArea className="h-full p-6">
          {isLoading || !data ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header - Midday style: date, description, amount stacked */}
              <div>
                <div className="text-xs text-muted-foreground">
                  {new Date((data as any).transaction.date as any).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <h2 className="mt-2 text-base font-medium text-foreground select-text">
                  {(data as any).transaction.name || (data as any).transaction.description || "-"}
                </h2>
                <div className="mt-2 text-4xl font-mono">
                  {(() => {
                    const cur = (data as any).transaction.currency as string;
                    const amt = Number((data as any).transaction.amount || 0);
                    return new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: cur || "GHS",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(amt);
                  })()}
                </div>
              </div>

              {/* Status + Meta */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Type</div>
                  <div>
                    {(() => {
                      const t = String((data as any).transaction.type || "");
                      return t ? t.charAt(0).toUpperCase() + t.slice(1) : "-";
                    })()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Status">
                    {(
                      [
                        { id: "completed", label: "Completed", cls: "bg-green-100 text-green-700 border-green-200" },
                        { id: "pending", label: "Pending", cls: "bg-amber-100 text-amber-700 border-amber-200" },
                        { id: "cancelled", label: "Cancelled", cls: "bg-slate-100 text-slate-700 border-slate-200" },
                        { id: "failed", label: "Failed", cls: "bg-red-100 text-red-700 border-red-200" },
                      ] as const
                    ).map((s) => {
                      const cur = String((data as any).transaction.status || "");
                      const selected = cur === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() =>
                            bulkUpdate.mutate({
                              transactionIds: [(data as any).transaction.id],
                              updates: { status: s.id as any },
                            })
                          }
                          className={
                            "rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors " +
                            s.cls +
                            (selected ? " ring-2 ring-offset-0" : " opacity-90 hover:opacity-100")
                          }
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Transaction #</div>
                  <div>{(data as any).transaction.transactionNumber || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Origin</div>
                  <div className="text-sm text-muted-foreground">
                    {(data as any).transaction.manual ? "Manual" : "System"}
                  </div>
                </div>
              </div>

              {/* Editors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="mb-2 text-sm font-medium">Category</div>
                  <SelectCategory
                    selected={
                      (data as any).category
                        ? {
                            id: (data as any).category.id,
                            name: (data as any).category.name,
                            color: (data as any).category.color,
                          }
                        : undefined
                    }
                    onChange={(cat) => {
                      // find slug from categoriesTree
                      const findSlug = (nodes: any[], id: string): string | undefined => {
                        for (const n of nodes) {
                          if (n.id === id) return n.slug;
                          if (n.children?.length) {
                            const s = findSlug(n.children, id);
                            if (s) return s;
                          }
                        }
                      };
                      const slug = findSlug(categoriesTree as any[], cat.id);
                      if (!slug) return;
                      bulkUpdate.mutate({
                        transactionIds: [(data as any).transaction.id],
                        updates: { categorySlug: slug },
                      });
                    }}
                  />
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium">Assign</div>
                  <SelectUser
                    onSelect={(user) =>
                      bulkUpdate.mutate({
                        transactionIds: [(data as any).transaction.id],
                        updates: { assignedId: user.id },
                      })
                    }
                  />
                </div>
              </div>

              <div>
                  <div className="mb-2 text-sm font-medium">Tags</div>
                <TagsEditor transactionId={(data as any).transaction.id} existing={((data as any).tags ?? []) as any[]} />
              </div>

              <Accordion type="multiple" defaultValue={["general", "attachments", "note"]}>
                <AccordionItem value="general">
                  <AccordionTrigger>General</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                          <div className="font-medium">Exclude from analytics</div>
                          <p className="text-xs text-muted-foreground">Exclude this transaction from KPIs and summaries.</p>
                        </div>
                        <Switch
                          checked={(data as any).transaction.excludeFromAnalytics ?? false}
                          onCheckedChange={(checked) =>
                            bulkUpdate.mutate({
                              transactionIds: [(data as any).transaction.id],
                              updates: { excludeFromAnalytics: checked },
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                          <div className="font-medium">Mark as recurring</div>
                          <p className="text-xs text-muted-foreground">Future similar transactions will be auto-categorized.</p>
                        </div>
                        <Switch
                          checked={(data as any).transaction.recurring ?? false}
                          onCheckedChange={(checked) =>
                            bulkUpdate.mutate({
                              transactionIds: [(data as any).transaction.id],
                              updates: { recurring: checked },
                            })
                          }
                        />
                      </div>

                      {((data as any).transaction.recurring ?? false) && (
                        <div>
                          <div className="mb-2 text-sm font-medium">Frequency</div>
                          <Select
                            value={((data as any).transaction.frequency as string) ?? undefined}
                            onValueChange={(value) =>
                              bulkUpdate.mutate({
                                transactionIds: [(data as any).transaction.id],
                                updates: { frequency: value as any, recurring: true },
                              })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {[
                                  { id: "weekly", name: "Weekly" },
                                  { id: "biweekly", name: "Biweekly" },
                                  { id: "semi_monthly", name: "Semi-monthly" },
                                  { id: "monthly", name: "Monthly" },
                                  { id: "annually", name: "Annually" },
                                  { id: "irregular", name: "Irregular" },
                                ].map(({ id, name }) => (
                                  <SelectItem key={id} value={id}>
                                    {name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="attachments">
                  <AccordionTrigger>Attachments</AccordionTrigger>
                  <AccordionContent>
                    <AttachmentsEditor data={data as any} transactionId={(data as any).transaction.id} />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="note">
                  <AccordionTrigger>Notes</AccordionTrigger>
                  <AccordionContent>
                    <NoteEditor
                      initialValue={(data as any).transaction.notes ?? ""}
                      onSave={(val) =>
                        bulkUpdate.mutate({
                          transactionIds: [(data as any).transaction.id],
                          updates: { notes: val },
                        })
                      }
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

type Tag = { id: string; name: string; color: string | null };

function TagsEditor({ transactionId, existing }: { transactionId: string; existing: Tag[] }) {
  const utils = trpc.useUtils();
  const { data: allTags = [] } = trpc.tags.list.useQuery();
  const addTag = trpc.transactionTags.add.useMutation({
    onSuccess: async () => {
      await utils.transactions.byId.invalidate({ id: transactionId });
      await utils.transactions.enrichedList.invalidate();
    },
  });
  const removeTag = trpc.transactionTags.remove.useMutation({
    onSuccess: async () => {
      await utils.transactions.byId.invalidate({ id: transactionId });
      await utils.transactions.enrichedList.invalidate();
    },
  });

  const [selected, setSelected] = useState<string[]>(() => existing.map((t) => t.id));
  const selectedSet = new Set(selected);
  const items = (allTags as any[]).map((t) => ({ id: String(t.id), label: String(t.name) }));
  const selectedTags: Tag[] = (allTags as any[]).filter((t) => selectedSet.has(String(t.id)));
  const [expanded, setExpanded] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const onChange = (ids: string[]) => {
    const next = new Set(ids);
    // removed
    for (const id of selected) {
      if (!next.has(id)) removeTag.mutate({ transactionId, tagId: id });
    }
    // added
    for (const id of ids) {
      if (!selectedSet.has(id)) addTag.mutate({ transactionId, tagId: id });
    }
    setSelected(ids);
  };

  const renderDot = (color: string | null | undefined) => (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={color ? { backgroundColor: color } : undefined}
    />
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {selectedTags.length ? (
          (expanded ? selectedTags : selectedTags.slice(0, 3)).map((t: any) => (
            <span
              key={t.id}
              className="group inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] bg-muted/60"
              style={t.color ? { borderColor: `${t.color}55`, backgroundColor: `${t.color}15` } : undefined}
            >
              {renderDot(t.color)}
              <span className="truncate">{t.name}</span>
              <button
                aria-label="Remove tag"
                className="ml-0.5 opacity-60 hover:opacity-100"
                onClick={() => onChange(selected.filter((id) => id !== String(t.id)))}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">No tags</span>
        )}
        {!expanded && selectedTags.length > 3 && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:underline"
            onClick={() => setExpanded(true)}
          >
            +{selectedTags.length - 3} more
          </button>
        )}
        {expanded && selectedTags.length > 3 && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:underline"
            onClick={() => setExpanded(false)}
          >
            Show less
          </button>
        )}
      </div>
      <Popover open={manageOpen} onOpenChange={setManageOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="text-xs text-muted-foreground hover:underline" data-row-click-exempt>
            {selected.length ? "Manage" : "Add tags"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[260px]" align="start">
          <Command loop shouldFilter={false}>
            <CommandInput placeholder="Search tags…" className="px-3" />
            <CommandGroup>
              <div className="max-h-[225px] overflow-auto">
                {(allTags as any[]).map((t: any) => {
                  const isChecked = selectedSet.has(String(t.id));
                  return (
                    <CommandItem
                      key={t.id}
                      value={String(t.id)}
                      onSelect={(id) => {
                        const already = selectedSet.has(id);
                        if (already) removeTag.mutate({ transactionId, tagId: id });
                        else addTag.mutate({ transactionId, tagId: id });
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(id)) next.delete(id);
                          else next.add(id);
                          return Array.from(next);
                        });
                      }}
                      className="cursor-pointer"
                    >
                      <Check className={cn("mr-2 h-4 w-4", isChecked ? "opacity-100" : "opacity-0")} />
                      {t.name}
                    </CommandItem>
                  );
                })}
                <CommandEmpty>No tags</CommandEmpty>
              </div>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function NoteEditor({ initialValue, onSave }: { initialValue: string; onSave: (value: string) => void }) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Auto-save on debounce
  useEffect(() => {
    const id = setTimeout(() => {
      if (value !== initialValue) onSave(value);
    }, 500);
    return () => clearTimeout(id);
  }, [value, initialValue, onSave]);

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add internal notes"
        onBlur={() => onSave(value)}
        rows={6}
        className="resize-y min-h-[160px]"
      />
    </div>
  );
}

function AttachmentsEditor({ data, transactionId }: { data: any; transactionId: string }) {
  const utils = trpc.useUtils();
  const [attachmentQuery, setAttachmentQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const attachmentsAdd = trpc.transactions.attachmentsAdd.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.transactions.byId.invalidate({ id: transactionId }),
        utils.transactions.enrichedList.invalidate(),
      ]);
    },
  });
  const attachmentsRemove = trpc.transactions.attachmentsRemove.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.transactions.byId.invalidate({ id: transactionId }),
        utils.transactions.enrichedList.invalidate(),
      ]);
    },
  });
  const { data: docsSearch } = trpc.documents.list.useQuery(
    { q: attachmentQuery, limit: 10 },
    { enabled: attachmentQuery.length > 1 },
  );

  const onDrop = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded: {
        path: string;
        filename?: string;
        contentType?: string | null;
        size?: number | null;
      }[] = [];
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const supabase = createBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token || "";
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`${base}/transactions/uploads`, {
          method: "POST",
          headers: { Authorization: token ? `Bearer ${token}` : "" },
          body: fd,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Upload failed");
        uploaded.push({
          path: json.path,
          filename: json.filename,
          contentType: json.contentType,
          size: json.size,
        });
      }
      if (uploaded.length) {
        await attachmentsAdd.mutateAsync({ transactionId, attachments: uploaded as any });
      }
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    maxFiles: 25,
    maxSize: 3 * 1024 * 1024,
    noClick: true,
    multiple: true,
  });

  const existing: Array<{ id: string; name: string; path: string[]; mimeType?: string | null }> =
    (data?.attachments as any[]) || [];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search attachment"
          value={attachmentQuery}
          onChange={(e) => setAttachmentQuery(e.target.value)}
        />
      </div>
      {attachmentQuery.length > 1 && (docsSearch as any)?.items?.length > 0 && (
        <div className="border rounded-md divide-y max-h-48 overflow-auto text-sm">
          {(docsSearch as any).items.map((doc: any) => (
            <button
              type="button"
              key={doc.id}
              className="w-full text-left px-3 py-2 hover:bg-secondary"
              onClick={async () => {
                const path = (doc.pathTokens || []).join("/");
                await attachmentsAdd.mutateAsync({
                  transactionId,
                  attachments: [
                    {
                      path,
                      filename: doc.name,
                      contentType: doc.mimeType || null,
                      size: doc.size || null,
                    },
                  ] as any,
                });
                setAttachmentQuery("");
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{doc.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(doc.mimeType || "").split("/")[1] || "file"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div
        {...getRootProps()}
        className={`border border-dashed rounded-md px-4 text-sm min-h-[120px] flex items-center justify-center text-center ${isDragActive ? "bg-secondary" : "bg-background"}`}
      >
        <input {...getInputProps()} />
        <p className="text-muted-foreground">
          Drop your files here, or {" "}
          <button type="button" onClick={open} className="underline">
            click to browse
          </button>
          .<br />3MB file limit.
        </p>
      </div>

      {existing.length > 0 && (
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          {existing.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between gap-2">
              <span className="truncate">{a.name || (a.path || []).join("/")}</span>
              <button
                type="button"
                className="text-red-600"
                onClick={() => attachmentsRemove.mutate({ attachmentId: a.id })}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
