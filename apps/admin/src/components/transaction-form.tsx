"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@cimantikos/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const transactionFormSchema = z.object({
  type: z.enum(["payment", "expense", "refund", "adjustment"]),
  amount: z.number().positive("Amount must be greater than 0"),
  currency: z.string(),
  clientId: z.string().optional(),
  invoiceId: z.string().optional(),
  orderId: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentReference: z.string().optional(),
  transactionDate: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  notes: z.string().optional(),
});

interface TransactionFormProps {
  onSuccess?: () => void;
  defaultInvoiceId?: string;
  defaultClientId?: string;
}

export function TransactionForm({ onSuccess, defaultInvoiceId, defaultClientId }: TransactionFormProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const form = useForm<z.infer<typeof transactionFormSchema>>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: "payment",
      amount: 0,
      currency: "GHS",
      clientId: defaultClientId || "",
      invoiceId: defaultInvoiceId || "",
      orderId: "",
      paymentMethod: "cash",
      paymentReference: "",
      transactionDate: new Date().toISOString().split("T")[0],
      description: "",
      notes: "",
    },
  });

  const { watch, setValue, handleSubmit, formState: { errors } } = form;
  const transactionType = watch("type");

  // Get clients for dropdown
  const { data: rawClients = [] } = trpc.clients.list.useQuery({ limit: 100 });
  const clients = Array.isArray(rawClients) ? rawClients : [];

  // Get invoices for dropdown (only unpaid ones)
  const { data: invoicesData } = trpc.invoices.list.useQuery({ limit: 50 });
  const invoices = Array.isArray(invoicesData) 
    ? invoicesData.filter((inv: any) => inv.status !== "paid")
    : [];

  const createMutation = trpc.transactions.createPayment.useMutation({
    onSuccess: () => {
      toast({ title: "Transaction recorded successfully!" });
      utils.transactions.list.invalidate();
      utils.transactions.stats.invalidate();
      utils.invoices.list.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      toast({ 
        title: "Failed to record transaction", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: z.infer<typeof transactionFormSchema>) => {
    createMutation.mutate({
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
    });
  };

  const isSaving = createMutation.isPending;

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

      {/* Amount & Currency */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...form.register("amount", { valueAsNumber: true })}
            className="font-mono text-right"
          />
          {errors.amount && (
            <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="currency">Currency</Label>
          <Input
            id="currency"
            defaultValue="GHS"
            {...form.register("currency")}
            className="font-mono"
          />
        </div>
      </div>

      {/* Customer (for payments/refunds) */}
      {(transactionType === "payment" || transactionType === "refund") && (
        <div>
          <Label htmlFor="clientId">Customer</Label>
          <Select 
            value={watch("clientId")} 
            onValueChange={(value) => setValue("clientId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select customer (optional)" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client: any) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Invoice (for payment allocation) */}
      {transactionType === "payment" && (
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
                  {invoice.invoiceNumber} - ₵{invoice.amount} ({invoice.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Automatically allocates payment to selected invoice
          </p>
        </div>
      )}

      {/* Payment Method */}
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

      {/* Payment Reference */}
      <div>
        <Label htmlFor="paymentReference">Payment Reference (Optional)</Label>
        <Input
          id="paymentReference"
          placeholder="e.g., Check #1234, Transaction ID"
          {...form.register("paymentReference")}
        />
      </div>

      {/* Transaction Date */}
      <div>
        <Label htmlFor="transactionDate">Transaction Date</Label>
        <Input
          id="transactionDate"
          type="date"
          {...form.register("transactionDate")}
        />
      </div>

      {/* Description */}
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

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          rows={3}
          placeholder="Additional details..."
          {...form.register("notes")}
          className="resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <SubmitButton type="submit" isSubmitting={isSaving} size="lg" className="min-w-[150px]">
          Record Transaction
        </SubmitButton>
      </div>
    </form>
  );
}
