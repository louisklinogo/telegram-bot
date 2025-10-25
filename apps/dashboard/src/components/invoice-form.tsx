"use client";

import { Label } from "@Faworra/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Plus, Save, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CustomerSelect } from "@/components/invoice/customer-select";
import { InvoiceLogo } from "@/components/invoice/invoice-logo";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/lib/trpc/client";

const invoiceFormSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  orderId: z.string().nullable(),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  logoUrl: z.string().optional(),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  discount: z.number().min(0),
  amount: z.number().min(0),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().int().min(1),
        unitPrice: z.number().min(0),
        total: z.number().min(0),
        orderItemId: z.string().optional(),
      })
    )
    .min(1),
});

// Use z.infer directly instead of creating an alias

interface InvoiceFormProps {
  invoiceId?: string | null;
  orderId?: string;
  onSuccess?: () => void;
}

export function InvoiceForm({ invoiceId, orderId, onSuccess }: InvoiceFormProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Load default settings
  const { data: defaultSettings, isLoading: loadingDefaults } =
    trpc.invoices.defaultSettings.useQuery(
      orderId ? { orderId } : undefined,
      { enabled: !invoiceId } // Only load for new invoices
    );

  // Load existing invoice for edit
  const { data: existingInvoice, isLoading: loadingInvoice } = trpc.invoices.getWithItems.useQuery(
    { id: invoiceId! },
    { enabled: !!invoiceId }
  );

  const form = useForm<z.infer<typeof invoiceFormSchema>>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: "",
      orderId: orderId || null,
      clientId: "",
      clientName: "",
      logoUrl: "",
      subtotal: 0,
      tax: 0,
      discount: 0,
      amount: 0,
      dueDate: "",
      notes: "",
      items: [{ name: "", quantity: 1, unitPrice: 0, total: 0 }],
    },
  });

  const {
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = form;
  const items = watch("items");
  const subtotal = watch("subtotal");
  const tax = watch("tax");
  const discount = watch("discount");

  // Auto-calculate amount when subtotal/tax/discount changes
  useEffect(() => {
    const newAmount = subtotal + tax - discount;
    setValue("amount", Math.max(0, newAmount));
  }, [subtotal, tax, discount, setValue]);

  // Load defaults when available
  useEffect(() => {
    if (defaultSettings && !invoiceId) {
      form.reset({
        invoiceNumber: defaultSettings.invoiceNumber,
        orderId: defaultSettings.orderId,
        subtotal: defaultSettings.subtotal,
        tax: defaultSettings.tax,
        discount: defaultSettings.discount,
        amount: defaultSettings.amount,
        dueDate: defaultSettings.dueDate || "",
        notes: defaultSettings.notes || "",
        items:
          defaultSettings.items.length > 0
            ? defaultSettings.items
            : [{ name: "", quantity: 1, unitPrice: 0, total: 0 }],
      });
    }
  }, [defaultSettings, invoiceId, form]);

  // Load existing invoice
  useEffect(() => {
    if (existingInvoice && invoiceId) {
      const invoice = existingInvoice.invoice;
      form.reset({
        invoiceNumber: invoice.invoiceNumber,
        orderId: invoice.orderId,
        subtotal: Number.parseFloat(String(invoice.subtotal)),
        tax: Number.parseFloat(String(invoice.tax || 0)),
        discount: Number.parseFloat(String(invoice.discount || 0)),
        amount: Number.parseFloat(String(invoice.amount)),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split("T")[0] : "",
        notes: invoice.notes || "",
        items: existingInvoice.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: Number.parseFloat(String(item.unitPrice)),
          total: Number.parseFloat(String(item.total)),
          orderItemId: item.orderItemId || undefined,
        })),
      });
    }
  }, [existingInvoice, invoiceId, form]);

  // Mutations
  const createMutation = trpc.invoices.create.useMutation({
    onSuccess: () => {
      toast({ title: "Invoice created successfully!" });
      utils.invoices.list.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Failed to create invoice",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = trpc.invoices.updateDraft.useMutation({
    onSuccess: (_, variables) => {
      // Only show toast for manual saves
      if (!(variables as any).isAutoSave) {
        toast({ title: "Invoice updated successfully!" });
      }
      utils.invoices.list.invalidate();
      utils.invoices.getWithItems.invalidate({ id: invoiceId! });

      // For auto-save, show saved status briefly
      if ((variables as any).isAutoSave) {
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 2000);
      } else {
        onSuccess?.();
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to update invoice",
        description: error.message,
        variant: "destructive",
      });
      setAutoSaveStatus("idle");
    },
  });

  const sendMutation = trpc.invoices.send.useMutation({
    onSuccess: () => {
      toast({ title: "Invoice sent successfully!", description: "Invoice is now immutable" });
      utils.invoices.list.invalidate();
      utils.invoices.getWithItems.invalidate({ id: invoiceId! });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Failed to send invoice",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate item total when quantity or unitPrice changes
  const updateItemTotal = (index: number) => {
    const item = items[index];
    if (item) {
      const total = item.quantity * item.unitPrice;
      setValue(`items.${index}.total`, total);

      // Recalculate subtotal
      const newSubtotal = items.reduce((sum, it, idx) => {
        if (idx === index) return sum + total;
        return sum + it.total;
      }, 0);
      setValue("subtotal", newSubtotal);
    }
  };

  const addItem = () => {
    const currentItems = form.getValues("items");
    form.setValue("items", [...currentItems, { name: "", quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    const currentItems = form.getValues("items");
    if (currentItems.length > 1) {
      const newItems = currentItems.filter((_, i) => i !== index);
      form.setValue("items", newItems);

      // Recalculate subtotal
      const newSubtotal = newItems.reduce((sum, item) => sum + item.total, 0);
      setValue("subtotal", newSubtotal);
    }
  };

  // Auto-save function (debounced)
  const autoSave = useCallback(
    (data: z.infer<typeof invoiceFormSchema>) => {
      // Only auto-save draft invoices
      if (!invoiceId || existingInvoice?.invoice?.status !== "draft") return;

      setAutoSaveStatus("saving");
      const payload = {
        id: invoiceId,
        subtotal: data.subtotal,
        tax: data.tax,
        discount: data.discount,
        amount: data.amount,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        notes: data.notes || null,
        items: data.items,
      };

      updateMutation.mutate(payload as any);
    },
    [invoiceId, existingInvoice, updateMutation]
  );

  // Watch form changes for auto-save
  useEffect(() => {
    if (!invoiceId || existingInvoice?.invoice?.status !== "draft") return;

    const subscription = watch((data) => {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for auto-save (10 seconds)
      autoSaveTimeoutRef.current = setTimeout(() => {
        try {
          const validatedData = invoiceFormSchema.parse(data);
          autoSave(validatedData);
        } catch (error) {
          // Validation errors are fine, don't auto-save
        }
      }, 10_000); // 10 second debounce
    });

    return () => {
      subscription.unsubscribe();
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [watch, invoiceId, existingInvoice, autoSave]);

  const onSubmit = (data: z.infer<typeof invoiceFormSchema>) => {
    // Clear auto-save timeout on manual submit
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    const payload = {
      invoiceNumber: data.invoiceNumber,
      orderId: data.orderId,
      clientId: data.clientId,
      logoUrl: data.logoUrl,
      subtotal: data.subtotal,
      tax: data.tax,
      discount: data.discount,
      amount: data.amount,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      notes: data.notes || null,
      items: data.items,
    };
    if (invoiceId) {
      updateMutation.mutate({ id: invoiceId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isLoading = loadingDefaults || loadingInvoice;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form className="space-y-8 py-6" onSubmit={handleSubmit(onSubmit)}>
      {/* Invoice Preview Header */}
      <div className="space-y-6">
        {/* Logo & Invoice Number */}
        <div className="flex items-start justify-between">
          <InvoiceLogo
            logoUrl={watch("logoUrl")}
            onRemove={() => setValue("logoUrl", undefined)}
            onUpload={(url) => setValue("logoUrl", url)}
          />

          <div className="space-y-2 text-right">
            <div>
              <Label className="text-muted-foreground text-xs">Invoice Number</Label>
              <Input
                {...form.register("invoiceNumber")}
                className="bg-muted text-right font-mono"
                readOnly
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button className="w-full justify-end" type="button" variant="outline">
                    {(() => {
                      const d = form.watch("dueDate");
                      return d ? new Date(d as string).toLocaleDateString() : "Select date";
                    })()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-0">
                  <Calendar
                    initialFocus
                    mode="single"
                    onSelect={(date) => {
                      form.setValue(
                        "dueDate",
                        date && date instanceof Date ? date.toISOString().split("T")[0] : ""
                      );
                    }}
                    selected={((): Date | undefined => {
                      const d = form.watch("dueDate");
                      return d ? new Date(d as string) : undefined;
                    })()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* From & To */}
        <div className="grid grid-cols-2 gap-8 border-t pt-4">
          <div>
            <Label className="mb-3 block font-semibold text-sm">From</Label>
            <div className="space-y-2">
              <Input
                className="font-medium"
                defaultValue="FaworraClothing"
                placeholder="Business Name"
              />
              <Input defaultValue="Accra, Ghana" placeholder="Address" />
              <Input defaultValue="+233 XXX XXX XXX" placeholder="Phone" />
            </div>
          </div>

          <div>
            <Label className="mb-3 block font-semibold text-sm">Bill To</Label>
            <div className="space-y-2">
              <CustomerSelect
                onSelect={(clientId, clientName) => {
                  setValue("clientId", clientId);
                  setValue("clientName", clientName);
                }}
                value={watch("clientId")}
              />
              {watch("clientName") && (
                <div className="pt-2 text-muted-foreground text-sm">
                  <p className="font-medium text-foreground">{watch("clientName")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="border-t pt-6">
        <div className="mb-4 flex items-center justify-between">
          <Label className="font-semibold text-base">Items</Label>
          <Button className="gap-1" onClick={addItem} size="sm" type="button" variant="outline">
            <Plus className="h-3 w-3" /> Add Line
          </Button>
        </div>

        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[2fr_80px_100px_100px_40px] gap-3 pb-2 font-medium text-muted-foreground text-xs">
            <div>Description</div>
            <div className="text-right">Qty</div>
            <div className="text-right">Price</div>
            <div className="text-right">Amount</div>
            <div />
          </div>

          {/* Items */}
          {items.map((item, index) => (
            <div
              className="grid grid-cols-[2fr_80px_100px_100px_40px] items-center gap-3"
              key={index}
            >
              <Input
                placeholder="Item name"
                {...form.register(`items.${index}.name`)}
                className="h-9"
              />

              <Input
                min="1"
                placeholder="1"
                type="number"
                {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                className="h-9 text-right"
                onChange={(e) => {
                  form.setValue(`items.${index}.quantity`, Number.parseInt(e.target.value) || 1);
                  updateItemTotal(index);
                }}
              />

              <Input
                min="0"
                placeholder="0.00"
                step="0.01"
                type="number"
                {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                className="h-9 text-right font-mono"
                onChange={(e) => {
                  form.setValue(`items.${index}.unitPrice`, Number.parseFloat(e.target.value) || 0);
                  updateItemTotal(index);
                }}
              />

              <div className="text-right font-mono text-sm">₵{item.total.toFixed(2)}</div>

              <Button
                className="h-9 w-9"
                disabled={items.length === 1}
                onClick={() => removeItem(index)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {errors.items && <p className="mt-2 text-destructive text-sm">{errors.items.message}</p>}
      </div>

      {/* Totals */}
      <div className="space-y-3 border-t pt-6">
        <div className="flex justify-end">
          <div className="w-80 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">₵{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label className="text-muted-foreground text-sm" htmlFor="tax">
                Tax
              </Label>
              <Input
                id="tax"
                min="0"
                placeholder="0.00"
                step="0.01"
                type="number"
                {...form.register("tax", { valueAsNumber: true })}
                className="h-8 w-32 text-right font-mono"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label className="text-muted-foreground text-sm" htmlFor="discount">
                Discount
              </Label>
              <Input
                id="discount"
                min="0"
                placeholder="0.00"
                step="0.01"
                type="number"
                {...form.register("discount", { valueAsNumber: true })}
                className="h-8 w-32 text-right font-mono"
              />
            </div>

            <div className="flex justify-between border-t pt-3 font-bold text-base">
              <span>Total</span>
              <span className="font-mono">₵{watch("amount").toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="border-t pt-6">
        <Label className="mb-2 block font-semibold text-sm" htmlFor="notes">
          Notes
        </Label>
        <Textarea
          id="notes"
          placeholder="Payment terms, delivery instructions, thank you message..."
          rows={4}
          {...form.register("notes")}
          className="resize-none"
        />
        <p className="mt-2 text-muted-foreground text-xs">
          Add any relevant notes or terms for this invoice
        </p>
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 flex justify-between gap-3 border-t bg-background pt-6 pb-2">
        <div className="flex items-center gap-2">
          {invoiceId && existingInvoice?.invoice?.status === "draft" && (
            <Button
              className="gap-2"
              disabled={sendMutation.isPending}
              onClick={() => sendMutation.mutate({ id: invoiceId })}
              type="button"
              variant="secondary"
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send Invoice
            </Button>
          )}

          {/* Auto-save indicator */}
          {invoiceId && existingInvoice?.invoice?.status === "draft" && (
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              {autoSaveStatus === "saving" && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Saving...</span>
                </>
              )}
              {autoSaveStatus === "saved" && (
                <>
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span>Saved</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="ml-auto flex gap-3">
          <Button className="min-w-[150px]" disabled={isSaving} size="lg" type="submit">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {invoiceId ? "Save Changes" : "Create Invoice"}
          </Button>
        </div>
      </div>
    </form>
  );
}
