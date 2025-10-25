"use client";

import { currencies } from "@Faworra/schemas";
import { createBrowserClient } from "@Faworra/supabase/client";
import { Label } from "@Faworra/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ComboboxDropdown, type ComboboxItem } from "@/components/ui/combobox-dropdown";
import { ComboboxMulti } from "@/components/ui/combobox-multi";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useTeamCurrency } from "@/hooks/use-team-currency";
import { formatAmount } from "@/lib/format-currency";
import { trpc } from "@/lib/trpc/client";

const transactionFormSchema = z.object({
  type: z.enum(["payment", "expense", "refund", "adjustment"]),
  amount: z.number().positive("Amount must be greater than 0"),
  currency: z.string(),
  clientId: z.string().optional(),
  invoiceId: z.string().optional(),
  orderId: z.string().optional(),
  accountId: z.string().optional(),
  categorySlug: z.string().optional(),
  assignedId: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentReference: z.string().optional(),
  transactionDate: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  notes: z.string().optional(),
  excludeFromAnalytics: z.boolean().optional(),
});

interface TransactionFormProps {
  onSuccess?: () => void;
  defaultInvoiceId?: string;
  defaultClientId?: string;
}

export function TransactionForm({
  onSuccess,
  defaultInvoiceId,
  defaultClientId,
}: TransactionFormProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const teamCurrency = useTeamCurrency();
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<
    { path: string; filename?: string; contentType?: string | null; size?: number | null }[]
  >([]);
  const [attachmentQuery, setAttachmentQuery] = useState("");

  const form = useForm<z.infer<typeof transactionFormSchema>>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: "payment",
      amount: 0,
      currency: teamCurrency,
      clientId: defaultClientId || "",
      invoiceId: defaultInvoiceId || "",
      orderId: "",
      accountId: "",
      categorySlug: "",
      assignedId: "",
      paymentMethod: "cash",
      paymentReference: "",
      transactionDate: new Date().toISOString().split("T")[0],
      description: "",
      notes: "",
      excludeFromAnalytics: false,
    },
  });

  const {
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = form;
  const transactionType = watch("type");
  const accountId = watch("accountId");
  const categorySlug = watch("categorySlug");

  // Get clients for dropdown
  const { data: rawClients } = trpc.clients.list.useQuery({ limit: 100 });
  const clients = (rawClients as any)?.items ?? [];

  // Get invoices for dropdown (only unpaid ones)
  const { data: invoicesResult } = trpc.invoices.list.useQuery({ limit: 50 });
  const invoicesRows = (invoicesResult as any)?.items ?? [];
  const selectedClientId = watch("clientId");
  const invoices = invoicesRows
    .filter((row: any) => (selectedClientId ? row?.client?.id === selectedClientId : true))
    .map((row: any) => row.invoice)
    .filter((inv: any) => inv && inv.status !== "paid");

  // Get accounts for dropdown (id, name, currency)
  const { data: accounts = [] } = trpc.transactions.accounts.useQuery();
  const createAccount = trpc.transactions.accountsCreate.useMutation();
  // Vault documents search for linking existing attachments
  const { data: docsSearch } = trpc.documents.list.useQuery(
    { q: attachmentQuery, limit: 10 },
    { enabled: attachmentQuery.length > 1 }
  );
  // Get categories (hierarchical)
  const { data: categoriesTree = [] } = trpc.transactionCategories.list.useQuery();
  // Tags
  const { data: availableTags = [] } = trpc.tags.list.useQuery();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const createTagMutation = trpc.tags.create.useMutation();
  type CategoryNode = {
    id: string;
    name: string;
    slug: string;
    color?: string | null;
    children?: CategoryNode[];
  };
  const flattenCategories = (
    nodes: CategoryNode[],
    depth = 0
  ): Array<CategoryNode & { depth: number }> => {
    const out: Array<CategoryNode & { depth: number }> = [];
    for (const n of nodes) {
      out.push({ ...n, depth });
      if (n.children && n.children.length) out.push(...flattenCategories(n.children, depth + 1));
    }
    return out;
  };
  const categoryItems = useMemo(() => {
    const flat = flattenCategories((categoriesTree as any) || []);
    return flat.map((c) => ({
      id: c.slug,
      label: c.name,
      depth: c.depth,
      color: c.color || undefined,
    })) as Array<ComboboxItem & { depth: number; color?: string }>;
  }, [categoriesTree]);
  const createCategoryMutation = trpc.transactionCategories.create.useMutation();
  // Team members for assignment
  const { data: members = [] } = trpc.transactions.members.useQuery();

  const createTransaction = trpc.transactions.create.useMutation({
    onSuccess: (_result, variables) => {
      toast({ title: "Transaction recorded successfully!" });
      // Invalidate all views that display transactions
      utils.transactions.enrichedList.invalidate();
      utils.transactions.list.invalidate();
      utils.transactions.stats.invalidate();
      utils.transactions.spending.invalidate();
      utils.transactions.recentLite.invalidate();
      // If it was a payment, invoices might be affected
      if ((variables as any)?.kind === "payment") {
        utils.invoices.list.invalidate();
      }
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Failed to record transaction",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof transactionFormSchema>) => {
    if (data.type === "payment") {
      createTransaction.mutate({
        kind: "payment",
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        clientId: data.clientId || undefined,
        invoiceId: data.invoiceId || undefined,
        orderId: data.orderId || undefined,
        paymentMethod: data.paymentMethod || undefined,
        paymentReference: data.paymentReference || undefined,
        transactionDate: data.transactionDate
          ? new Date(data.transactionDate).toISOString()
          : undefined,
        excludeFromAnalytics: !!data.excludeFromAnalytics,
        tags: selectedTags,
        attachments,
      } as any);
    } else {
      createTransaction.mutate({
        kind: "entry",
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        date: data.transactionDate || undefined,
        accountId: data.accountId || undefined,
        categorySlug: data.categorySlug || undefined,
        assignedId: data.assignedId || undefined,
        clientId: data.clientId || undefined,
        orderId: data.orderId || undefined,
        paymentMethod: data.paymentMethod || undefined,
        paymentReference: data.paymentReference || undefined,
        notes: data.notes || undefined,
        excludeFromAnalytics: !!data.excludeFromAnalytics,
        tags: selectedTags,
        attachments,
      } as any);
    }
  };

  const isSaving = createTransaction.isPending || uploading;

  // Smart defaults: first account and currency mapping
  const accountsFirstId = (accounts?.[0]?.id as string | undefined) || undefined;
  const accountsById = new Map<string, any>(accounts.map((a: any) => [a.id, a]));
  const amountVal = watch("amount");
  useEffect(() => {
    // default first account
    if (!accountId && accountsFirstId) setValue("accountId", accountsFirstId);
  }, [accountsFirstId, accountId, setValue]);
  useEffect(() => {
    // auto category: income for positive amounts, clear otherwise
    if (amountVal && amountVal > 0) {
      setValue("categorySlug", "income");
    } else if (!amountVal || amountVal <= 0) {
      setValue("categorySlug", "");
    }
  }, [amountVal, setValue]);

  // Attachments dropzone
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
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Upload failed");
        uploaded.push({
          path: data.path,
          filename: data.filename,
          contentType: data.contentType,
          size: data.size,
        });
      }
      setAttachments((prev) => [...prev, ...uploaded]);
      toast({ title: `Uploaded ${uploaded.length} file${uploaded.length > 1 ? "s" : ""}` });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: String(err?.message || err),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    maxFiles: 25,
    maxSize: 3 * 1024 * 1024, // 3MB like Midday
    noClick: true,
    multiple: true,
  });

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit(onSubmit)}>
      <div className="scrollbar-hide flex-1 overflow-y-auto px-6 py-4">
        <Accordion className="space-y-0" defaultValue={["general", "details"]} type="multiple">
          {/* General Section */}
          <AccordionItem value="general">
            <AccordionTrigger>General</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="type">Transaction Type</Label>
                  <Select
                    onValueChange={(value) => setValue("type", value as any)}
                    value={watch("type")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment">Payment (Income)</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type && (
                    <p className="mt-1 text-destructive text-sm">{errors.type.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Brief description of transaction"
                    {...form.register("description")}
                  />
                  {errors.description && (
                    <p className="mt-1 text-destructive text-sm">{errors.description.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <CurrencyInput
                      allowNegative={false}
                      className="text-right font-mono"
                      decimalScale={2}
                      id="amount"
                      onValueChange={(values) =>
                        setValue("amount", Number(values.value || 0), { shouldValidate: true })
                      }
                      placeholder="0.00"
                      value={watch("amount")}
                    />
                    {errors.amount && (
                      <p className="mt-1 text-destructive text-sm">{errors.amount.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      onValueChange={(v) => setValue("currency", v)}
                      value={watch("currency")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Details Section */}
          <AccordionItem value="details">
            <AccordionTrigger>Details</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="accountId">Account</Label>
                    <ComboboxDropdown
                      items={
                        accounts.map((a: any) => ({
                          id: a.id,
                          label: `${a.name} (${a.currency})`,
                        })) as ComboboxItem[]
                      }
                      onCreate={async (name) => {
                        const currency = watch("currency") || teamCurrency;
                        const res = await createAccount.mutateAsync({
                          name,
                          type: "cash",
                          currency,
                        });
                        await utils.transactions.accounts.invalidate();
                        setValue("accountId", res.id);
                        if (res.currency) setValue("currency", res.currency);
                      }}
                      onSelect={(item) => {
                        const id = item?.id || "";
                        setValue("accountId", id);
                        const acc = accountsById.get(id);
                        if (acc?.currency) setValue("currency", acc.currency);
                      }}
                      placeholder="Select account"
                      renderOnCreate={(value) => <span>Create "{value}"</span>}
                      searchPlaceholder="Search accounts..."
                      selectedItem={
                        accountId
                          ? ({
                              id: accountId,
                              label: `${accountsById.get(accountId)?.name ?? ""} (${accountsById.get(accountId)?.currency ?? ""})`,
                            } as ComboboxItem)
                          : undefined
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="transactionDate">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button className="w-full justify-start" type="button" variant="outline">
                          {((): string => {
                            const d = watch("transactionDate");
                            return d ? new Date(d as string).toLocaleDateString() : "Select date";
                          })()}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-0">
                        <Calendar
                          initialFocus
                          mode="single"
                          onSelect={(value) => {
                            setValue(
                              "transactionDate",
                              value ? value.toISOString().split("T")[0] : ""
                            );
                          }}
                          selected={((): Date | undefined => {
                            const d = watch("transactionDate");
                            return d ? new Date(d as string) : undefined;
                          })()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <Label>Tags</Label>
                  <ComboboxMulti
                    items={(availableTags as any[]).map((t) => ({ id: t.id, label: t.name }))}
                    onChange={setSelectedTags}
                    onCreate={async (name) => {
                      const created = await createTagMutation.mutateAsync({ name });
                      setSelectedTags((prev) => [...prev, created.id]);
                      await utils.tags.list.invalidate();
                    }}
                    placeholder="Select tags"
                    searchPlaceholder="Search or create tags..."
                    values={selectedTags}
                  />
                  <p className="mt-1 text-muted-foreground text-xs">
                    You can add tags to help filter transactions later.
                  </p>
                </div>

                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    onValueChange={(value) => setValue("paymentMethod", value)}
                    value={watch("paymentMethod")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Relationships - Conditional */}
                {(transactionType === "payment" || transactionType === "refund") && (
                  <>
                    <div className="font-medium text-muted-foreground text-sm">Relationships</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="clientId">Customer</Label>
                        <ComboboxDropdown
                          items={clients.map((c: any) => ({ id: c.id, label: c.name }))}
                          onSelect={(item) => setValue("clientId", item?.id || "")}
                          placeholder="Select customer"
                          searchPlaceholder="Search customers..."
                          selectedItem={
                            watch("clientId")
                              ? {
                                  id: watch("clientId")!,
                                  label:
                                    clients.find((c: any) => c.id === watch("clientId"))?.name ||
                                    "",
                                }
                              : undefined
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="invoiceId">Link to Invoice (Optional)</Label>
                        <Select
                          onValueChange={(value) => setValue("invoiceId", value)}
                          value={watch("invoiceId")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select invoice (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {invoices.map((invoice: any) => (
                              <SelectItem key={invoice.id} value={invoice.id}>
                                {invoice.invoiceNumber} -{" "}
                                {formatAmount({
                                  currency: invoice.currency || teamCurrency,
                                  amount: Number(invoice.amount || 0),
                                })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="mt-1 text-muted-foreground text-xs">
                          Automatically allocates payment to selected invoice
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Categorization */}
                <div className="font-medium text-muted-foreground text-sm">Categorization</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="categorySlug">Category</Label>
                    <ComboboxDropdown
                      items={categoryItems}
                      onCreate={async (name) => {
                        const row = await createCategoryMutation.mutateAsync({ name });
                        await utils.transactionCategories.list.invalidate();
                        setValue("categorySlug", row.slug);
                      }}
                      onSelect={(item) => setValue("categorySlug", item?.id || "")}
                      placeholder="Select category"
                      renderListItem={({ isChecked, item }) => (
                        <div className="flex w-full items-center gap-2">
                          <span style={{ paddingLeft: `${(item as any).depth * 12}px` }} />
                          <span
                            className="inline-block h-3 w-3 rounded-sm border"
                            style={{
                              backgroundColor: ((item as any).color as string) || "#e5e7eb",
                            }}
                          />
                          <span className="flex-1 truncate">{item.label}</span>
                          {isChecked ? <span className="text-xs">Selected</span> : null}
                        </div>
                      )}
                      renderOnCreate={(value) => <span>Create "{value}"</span>}
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
                      selectedItem={
                        categorySlug
                          ? (categoryItems.find((i) => i.id === categorySlug) as
                              | ComboboxItem
                              | undefined)
                          : undefined
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="assignedId">Assign</Label>
                    <ComboboxDropdown
                      items={members.map((m: any) => ({
                        id: m.id,
                        label: m.name || m.email || m.id,
                      }))}
                      onSelect={(item) => setValue("assignedId", item?.id || "")}
                      placeholder="Select member"
                      searchPlaceholder="Search member"
                      selectedItem={
                        watch("assignedId")
                          ? ({
                              id: watch("assignedId")!,
                              label:
                                members.find((m: any) => m.id === watch("assignedId"))?.name ||
                                members.find((m: any) => m.id === watch("assignedId"))?.email ||
                                "",
                            } as ComboboxItem)
                          : undefined
                      }
                    />
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Attachments & Notes Section */}
          <AccordionItem value="attachments">
            <AccordionTrigger>Attachments & Notes</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="font-medium text-muted-foreground text-sm">Attachment</div>
                <div className="space-y-2">
                  <div className="relative">
                    <Icons.Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      onChange={(e) => setAttachmentQuery(e.target.value)}
                      placeholder="Search attachment"
                      value={attachmentQuery}
                    />
                  </div>
                  {attachmentQuery.length > 1 && (docsSearch as any)?.items?.length > 0 && (
                    <div className="max-h-48 divide-y overflow-auto rounded-md border text-sm">
                      {(docsSearch as any).items.map((doc: any) => (
                        <button
                          className="w-full px-3 py-2 text-left hover:bg-secondary"
                          key={doc.id}
                          onClick={() => {
                            const path = (doc.pathTokens || []).join("/");
                            setAttachments((prev) => {
                              if (prev.some((a) => a.path === path)) return prev; // dedupe
                              return [
                                ...prev,
                                {
                                  path,
                                  filename: doc.name,
                                  contentType: doc.mimeType || null,
                                  size: doc.size || null,
                                },
                              ];
                            });
                            setAttachmentQuery("");
                          }}
                          type="button"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{doc.name}</span>
                            <span className="text-muted-foreground text-xs">
                              {(doc.mimeType || "").split("/")[1] || "file"}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <div
                    {...getRootProps()}
                    className={`flex min-h-[140px] items-center justify-center rounded-md border border-dashed px-4 text-center text-sm ${isDragActive ? "bg-secondary" : "bg-background"}`}
                  >
                    <input {...getInputProps()} />
                    <p className="text-muted-foreground">
                      Drop your files here, or{" "}
                      <button className="underline" onClick={open} type="button">
                        click to browse
                      </button>
                      .
                      <br />
                      3MB file limit.
                    </p>
                  </div>
                  {attachments.length > 0 && (
                    <div className="mt-2 space-y-1 text-muted-foreground text-xs">
                      {attachments.map((a, idx) => (
                        <div className="flex items-center justify-between gap-2" key={idx}>
                          <span className="truncate">{a.filename || a.path}</span>
                          <button
                            className="text-red-600"
                            onClick={() =>
                              setAttachments((prev) => prev.filter((_, i) => i !== idx))
                            }
                            type="button"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="paymentReference">Payment Reference (Optional)</Label>
                  <Input
                    id="paymentReference"
                    placeholder="e.g., Check #1234, Transaction ID"
                    {...form.register("paymentReference")}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Note</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional details..."
                    rows={3}
                    {...form.register("notes")}
                    className="resize-none"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="pr-4">
                    <p className="text-muted-foreground text-xs">
                      Exclude this transaction from analytics like profit, expense and revenue.
                    </p>
                  </div>
                  <Switch
                    checked={!!watch("excludeFromAnalytics")}
                    onCheckedChange={(checked) =>
                      setValue("excludeFromAnalytics", Boolean(checked))
                    }
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Footer actions aligned like Clients sheet */}
      <div className="flex flex-shrink-0 justify-end gap-4 border-t px-6 py-4">
        <Button
          disabled={isSaving || uploading}
          onClick={() => onSuccess?.()}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <SubmitButton disabled={uploading} isSubmitting={isSaving} type="submit">
          Record
        </SubmitButton>
      </div>
    </form>
  );
}
