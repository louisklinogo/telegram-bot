"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@cimantikos/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { createBrowserClient } from "@cimantikos/supabase/client";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ComboboxDropdown, type ComboboxItem } from "@/components/ui/combobox-dropdown";
import { currencies } from "@cimantikos/schemas";
import { useDropzone } from "react-dropzone";
import { Icons } from "@/components/ui/icons";

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

export function TransactionForm({ onSuccess, defaultInvoiceId, defaultClientId }: TransactionFormProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<{ path: string; filename?: string; contentType?: string | null; size?: number | null }[]>([]);
  const [attachmentQuery, setAttachmentQuery] = useState("");

  const form = useForm<z.infer<typeof transactionFormSchema>>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: "payment",
      amount: 0,
      currency: "GHS",
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

  const { watch, setValue, handleSubmit, formState: { errors } } = form;
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
  type CategoryNode = { id: string; name: string; slug: string; color?: string | null; children?: CategoryNode[] };
  const flattenCategories = (nodes: CategoryNode[], depth = 0): Array<CategoryNode & { depth: number }> => {
    const out: Array<CategoryNode & { depth: number }> = [];
    for (const n of nodes) {
      out.push({ ...n, depth });
      if (n.children && n.children.length) out.push(...flattenCategories(n.children, depth + 1));
    }
    return out;
  };
  const categoryItems = useMemo(() => {
    const flat = flattenCategories((categoriesTree as any) || []);
    return flat.map((c) => ({ id: c.slug, label: c.name, depth: c.depth, color: c.color || undefined })) as Array<ComboboxItem & { depth: number; color?: string }>;
  }, [categoriesTree]);
  const createCategoryMutation = trpc.transactionCategories.create.useMutation();
  // Team members for assignment
  const { data: members = [] } = trpc.transactions.members.useQuery();

  const createTransaction = trpc.transactions.create.useMutation({
    onSuccess: (_result, variables) => {
      toast({ title: "Transaction recorded successfully!" });
      utils.transactions.list.invalidate();
      utils.transactions.stats.invalidate();
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
      const uploaded: { path: string; filename?: string; contentType?: string | null; size?: number | null }[] = [];
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
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
        uploaded.push({ path: data.path, filename: data.filename, contentType: data.contentType, size: data.size });
      }
      setAttachments((prev) => [...prev, ...uploaded]);
      toast({ title: `Uploaded ${uploaded.length} file${uploaded.length > 1 ? "s" : ""}` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: String(err?.message || err), variant: "destructive" });
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
      {/* Transaction Type */}
      <div>
        <Label htmlFor="type">Transaction Type</Label>
        <Select 
          value={watch("type")} 
          onValueChange={(value) => setValue("type", value as any)}
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
          <p className="text-sm text-destructive mt-1">{errors.type.message}</p>
        )}
      </div>

      {/* Description at top */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="Brief description of transaction"
          {...form.register("description")}
        />
        {errors.description && (
          <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
        )}
      </div>

      {/* Amount, Currency, Account, Date */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 md:col-span-1">
          <Label htmlFor="amount">Amount</Label>
          <CurrencyInput
            id="amount"
            allowNegative={false}
            decimalScale={2}
            value={watch("amount")}
            onValueChange={(values) => setValue("amount", Number(values.value || 0), { shouldValidate: true })}
            placeholder="0.00"
            className="text-right font-mono"
          />
          {errors.amount && (
            <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>
          )}
        </div>

        <div className="col-span-1">
          <Label htmlFor="currency">Currency</Label>
          <Select value={watch("currency")} onValueChange={(v) => setValue("currency", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1">
          <Label htmlFor="accountId">Account</Label>
          <ComboboxDropdown
            items={accounts.map((a: any) => ({ id: a.id, label: `${a.name} (${a.currency})` })) as ComboboxItem[]}
            selectedItem={accountId ? { id: accountId, label: `${accountsById.get(accountId)?.name ?? ""} (${accountsById.get(accountId)?.currency ?? ""})` } as ComboboxItem : undefined}
            onSelect={(item) => {
              const id = item?.id || "";
              setValue("accountId", id);
              const acc = accountsById.get(id);
              if (acc?.currency) setValue("currency", acc.currency);
            }}
            onCreate={async (name) => {
              const currency = watch("currency") || "GHS";
              const res = await createAccount.mutateAsync({ name, type: "cash", currency });
              await utils.transactions.accounts.invalidate();
              setValue("accountId", res.id);
              if (res.currency) setValue("currency", res.currency);
            }}
            placeholder="Select account"
            searchPlaceholder="Search accounts..."
            renderOnCreate={(value) => <span>Create "{value}"</span>}
          />
        </div>
        <div className="col-span-1">
          <Label htmlFor="transactionDate">Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-start">
                {((): string => { const d = watch("transactionDate"); return d ? new Date(d as string).toLocaleDateString() : "Select date"; })()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={((): Date | undefined => { const d = watch("transactionDate"); return d ? new Date(d as string) : undefined; })()}
                onSelect={(value) => {
                  setValue("transactionDate", value ? value.toISOString().split("T")[0] : "");
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Customer (for payments/refunds) */}
      {(transactionType === "payment" || transactionType === "refund") && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Relationships</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientId">Customer</Label>
              <ComboboxDropdown
                items={clients.map((c: any) => ({ id: c.id, label: c.name }))}
                selectedItem={watch("clientId") ? { id: watch("clientId")!, label: clients.find((c: any) => c.id === watch("clientId"))?.name || "" } : undefined}
                onSelect={(item) => setValue("clientId", item?.id || "")}
                placeholder="Select customer"
                searchPlaceholder="Search customers..."
              />
            </div>
            <div>
              <Label htmlFor="invoiceId">Link to Invoice (Optional)</Label>
              <Select 
                value={watch("invoiceId")} 
                onValueChange={(value) => setValue("invoiceId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((invoice: any) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber} - {invoice.currency || "GHS"} {invoice.amount}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Automatically allocates payment to selected invoice</p>
            </div>
          </div>
        </div>
      )}

      {/* Categorization */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="categorySlug">Category</Label>
          <ComboboxDropdown
            items={categoryItems}
            selectedItem={
              categorySlug
                ? (categoryItems.find((i) => i.id === categorySlug) as ComboboxItem | undefined)
                : undefined
            }
            onSelect={(item) => setValue("categorySlug", item?.id || "")}
            placeholder="Select category"
            searchPlaceholder="Search category"
            onCreate={async (name) => {
              const row = await createCategoryMutation.mutateAsync({ name });
              await utils.transactionCategories.list.invalidate();
              setValue("categorySlug", row.slug);
            }}
            renderOnCreate={(value) => <span>Create "{value}"</span>}
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
        </div>
        <div>
          <Label htmlFor="assignedId">Assign</Label>
          <ComboboxDropdown
            items={members.map((m: any) => ({ id: m.id, label: m.name || m.email || m.id }))}
            selectedItem={watch("assignedId") ? { id: watch("assignedId")!, label: (members.find((m: any) => m.id === watch("assignedId"))?.name || members.find((m: any) => m.id === watch("assignedId"))?.email || "") } as ComboboxItem : undefined}
            onSelect={(item) => setValue("assignedId", item?.id || "")}
            placeholder="Select member"
            searchPlaceholder="Search member"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="paymentMethod">Payment Method</Label>
        <Select
          value={watch("paymentMethod")}
          onValueChange={(value) => setValue("paymentMethod", value)}
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

      {/* Relationships are above; advanced settings below */}

      {/* Details group */}
      <div className="space-y-4">
        <div className="text-sm font-medium text-muted-foreground">Attachment</div>
        <div className="space-y-2">
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
                  onClick={() => {
                    const path = (doc.pathTokens || []).join("/");
                    setAttachments((prev) => {
                      if (prev.some((a) => a.path === path)) return prev; // dedupe
                      return [
                        ...prev,
                        { path, filename: doc.name, contentType: doc.mimeType || null, size: doc.size || null },
                      ];
                    });
                    setAttachmentQuery("");
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{doc.name}</span>
                    <span className="text-xs text-muted-foreground">{(doc.mimeType || "").split("/")[1] || "file"}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div
            {...getRootProps()}
            className={`border border-dashed rounded-md px-4 text-sm min-h-[140px] flex items-center justify-center text-center ${isDragActive ? "bg-secondary" : "bg-background"}`}
          >
            <input {...getInputProps()} />
            <p className="text-muted-foreground">
              Drop your files here, or <button type="button" onClick={open} className="underline">click to browse</button>.
              <br />
              3MB file limit.
            </p>
          </div>
          {attachments.length > 0 && (
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              {attachments.map((a, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2">
                  <span className="truncate">{a.filename || a.path}</span>
                  <button type="button" className="text-red-600" onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="paymentReference">Payment Reference (Optional)</Label>
          <Input id="paymentReference" placeholder="e.g., Check #1234, Transaction ID" {...form.register("paymentReference")} />
        </div>

        <div>
          <Label htmlFor="notes">Note</Label>
          <Textarea id="notes" rows={3} placeholder="Additional details..." {...form.register("notes")} className="resize-none" />
        </div>

        <div className="flex items-center justify-between">
          <div className="pr-4">
            <p className="text-xs text-muted-foreground">Exclude this transaction from analytics like profit, expense and revenue.</p>
          </div>
          <Switch checked={!!watch("excludeFromAnalytics")} onCheckedChange={(checked) => setValue("excludeFromAnalytics", Boolean(checked))} />
        </div>
      </div>

      {/* Actions: sticky bottom bar */}
      <div className="sticky bottom-0 left-0 right-0 border-t bg-background pt-4 pb-2">
        <SubmitButton type="submit" isSubmitting={isSaving} size="lg" className="min-w-[150px]" disabled={uploading}>
          Record Transaction
        </SubmitButton>
      </div>
    </form>
  );
}
