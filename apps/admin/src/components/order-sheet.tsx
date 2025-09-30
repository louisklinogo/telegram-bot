"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { useCreateOrder, useUpdateOrder } from "@/hooks/use-order-mutations";
import { useClients } from "@/hooks/use-supabase-data";
import type { OrderWithClient } from "@/lib/supabase-queries";

interface OrderItem {
  name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

interface OrderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: OrderWithClient | null;
}

export function OrderSheet({ open, onOpenChange, order }: OrderSheetProps) {
  const { data: clients = [] } = useClients();
  const createMutation = useCreateOrder();
  const updateMutation = useUpdateOrder();

  const [formData, setFormData] = useState({
    client_id: order?.client_id || "",
    status: order?.status || "Generated",
    notes: order?.notes || "",
    deposit_amount: order ? parseFloat(String((order as any).deposit_amount || (order as any).depositAmount || "0")) : 0,
    due_date: order ? ((order as any).due_date || (order as any).dueDate || "").split("T")[0] || "" : "",
  });

  const [items, setItems] = useState<OrderItem[]>(
    order?.items && Array.isArray(order.items) && order.items.length > 0
      ? (order.items as OrderItem[])
      : [{ name: "", quantity: 1, unit_cost: 0, total_cost: 0 }]
  );

  const isEdit = !!order;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Generate order number
  const generateOrderNumber = () => {
    const prefix = "ORD";
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  };

  // Calculate totals
  const calculateItemTotal = (quantity: number, unitCost: number) => {
    return quantity * unitCost;
  };

  const totalPrice = items.reduce((sum, item) => sum + item.total_cost, 0);
  const balanceAmount = totalPrice - formData.deposit_amount;

  // Handle item changes
  const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate total_cost when quantity or unit_cost changes
    if (field === "quantity" || field === "unit_cost") {
      newItems[index].total_cost = calculateItemTotal(
        newItems[index].quantity,
        newItems[index].unit_cost
      );
    }

    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { name: "", quantity: 1, unit_cost: 0, total_cost: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate at least one item
    const validItems = items.filter((item) => item.name.trim() !== "");
    if (validItems.length === 0) {
      alert("Please add at least one item");
      return;
    }

    const orderData = {
      client_id: formData.client_id || null,
      order_number: isEdit ? order.order_number : generateOrderNumber(),
      status: formData.status,
      items: validItems,
      total_price: totalPrice.toString(),
      deposit_amount: formData.deposit_amount.toString(),
      balance_amount: balanceAmount.toString(),
      notes: formData.notes || null,
      due_date: formData.due_date || null,
    };

    if (isEdit) {
      await updateMutation.mutateAsync({ id: order.id, data: orderData });
    } else {
      await createMutation.mutateAsync(orderData);
    }

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      status: "Generated",
      notes: "",
      deposit_amount: 0,
      due_date: "",
    });
    setItems([{ name: "", quantity: 1, unit_cost: 0, total_cost: 0 }]);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  // Update form when order prop changes
  useEffect(() => {
    if (order && open) {
      setFormData({
        client_id: order.client_id || "",
        status: order.status || "Generated",
        notes: order.notes || "",
        deposit_amount: parseFloat(String((order as any).deposit_amount || (order as any).depositAmount || "0")),
        due_date: ((order as any).due_date || (order as any).dueDate || "").split("T")[0] || "",
      });
      setItems(
        order.items && Array.isArray(order.items) && order.items.length > 0
          ? (order.items as OrderItem[])
          : [{ name: "", quantity: 1, unit_cost: 0, total_cost: 0 }]
      );
    }
  }, [order, open]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Order" : "Create New Order"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update order details and items." : "Add client, items, and payment information."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="client_id">Client</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData({ ...formData, client_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} {client.phone && `(${client.phone})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">
              Status <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Generated">Generated</SelectItem>
                <SelectItem value="In progress">In progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                Items <span className="text-destructive">*</span>
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-4 w-4" /> Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Item {index + 1}</span>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3">
                    <div>
                      <Label className="text-xs">Item Name</Label>
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(index, "name", e.target.value)}
                        placeholder="e.g., Kaftan"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Unit Cost (₵)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_cost}
                          onChange={(e) =>
                            updateItem(index, "unit_cost", parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Total (₵)</Label>
                        <Input
                          type="number"
                          value={item.total_cost.toFixed(2)}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
            <h4 className="font-medium text-sm">Payment Summary</h4>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Price:</span>
                <span className="font-medium">₵{totalPrice.toFixed(2)}</span>
              </div>

              <div>
                <Label htmlFor="deposit_amount" className="text-xs">Deposit Amount (₵)</Label>
                <Input
                  id="deposit_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  max={totalPrice}
                  value={formData.deposit_amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deposit_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground">Balance Due:</span>
                <span className="font-semibold">₵{balanceAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes about this order..."
              rows={3}
            />
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : isEdit ? "Update Order" : "Create Order"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
