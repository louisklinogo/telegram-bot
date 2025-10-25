"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";

type OrderItemInput = {
  name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
};

type CreateOrderInput = {
  clientId: string | null;
  orderNumber: string;
  status: "generated" | "in_progress" | "completed" | "cancelled";
  items: OrderItemInput[];
  totalPrice: number;
  depositAmount: number;
  balanceAmount: number;
  notes?: string | null;
  dueDate?: string | null;
};

export function useCreateOrder() {
  const utils = trpc.useUtils();
  const m = trpc.orders.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.orders.list.invalidate(),
        utils.invoices.list.invalidate(),
        utils.invalidate(), // also refresh analytics cards
      ]);
      toast.success("Order created successfully");
    },
    onError: (error: any) => toast.error(`Failed to create order: ${error?.message}`),
  });

  function normalizeCreateInput(
    payload: CreateOrderInput | Record<string, unknown>
  ): CreateOrderInput {
    const p = payload as any;
    const clientId = ("clientId" in p ? p.clientId : p.client_id) ?? null;
    const orderNumber = ("orderNumber" in p ? p.orderNumber : p.order_number) as string;
    const status = String(
      "status" in p ? p.status : "generated"
    ).toLowerCase() as CreateOrderInput["status"];
    const items = (p.items ?? []) as OrderItemInput[];
    const totalPrice = Number(("totalPrice" in p ? p.totalPrice : p.total_price) ?? 0);
    const depositAmount = Number(("depositAmount" in p ? p.depositAmount : p.deposit_amount) ?? 0);
    const balanceAmount = Number(("balanceAmount" in p ? p.balanceAmount : p.balance_amount) ?? 0);
    const notes = ("notes" in p ? p.notes : null) as string | null;
    const due = ("dueDate" in p ? p.dueDate : p.due_date) as string | null | undefined;
    const dueDate = due
      ? typeof due === "string"
        ? due.includes("T")
          ? due
          : `${due}T00:00:00Z`
        : new Date(due).toISOString()
      : null;
    return {
      clientId,
      orderNumber,
      status,
      items,
      totalPrice,
      depositAmount,
      balanceAmount,
      notes,
      dueDate,
    };
  }

  return {
    ...m,
    mutate: (payload: CreateOrderInput | Record<string, unknown>, opts?: any) =>
      (m as any).mutate(normalizeCreateInput(payload), opts),
    mutateAsync: (payload: CreateOrderInput | Record<string, unknown>, opts?: any) =>
      (m as any).mutateAsync(normalizeCreateInput(payload), opts),
  } as typeof m;
}

export function useUpdateOrder() {
  const utils = trpc.useUtils();
  const m = trpc.orders.update.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.orders.list.invalidate(), utils.invalidate()]);
      toast.success("Order updated successfully");
    },
    onError: (error: any) => toast.error(`Failed to update order: ${error?.message}`),
  });

  type UpdateOrderClientPayload = {
    id: string;
    data: Partial<CreateOrderInput> | Record<string, unknown>;
  };

  function normalizeUpdateInput({
    id,
    data,
  }: {
    id: string;
    data: Partial<CreateOrderInput> | Record<string, unknown>;
  }): { id: string } & Partial<CreateOrderInput> {
    const d = data as any;
    const out: any = { id };
    if (d.clientId !== undefined || d.client_id !== undefined)
      out.clientId = d.clientId ?? d.client_id ?? null;
    if (d.orderNumber !== undefined || d.order_number !== undefined)
      out.orderNumber = d.orderNumber ?? d.order_number;
    if (d.status !== undefined) out.status = String(d.status).toLowerCase();
    if (d.items !== undefined) out.items = d.items as OrderItemInput[];
    if (d.totalPrice !== undefined || d.total_price !== undefined)
      out.totalPrice = Number(d.totalPrice ?? d.total_price);
    if (d.depositAmount !== undefined || d.deposit_amount !== undefined)
      out.depositAmount = Number(d.depositAmount ?? d.deposit_amount);
    if (d.balanceAmount !== undefined || d.balance_amount !== undefined)
      out.balanceAmount = Number(d.balanceAmount ?? d.balance_amount);
    if (d.notes !== undefined) out.notes = d.notes;
    if (d.dueDate !== undefined || d.due_date !== undefined) {
      const due = d.dueDate ?? d.due_date;
      out.dueDate = due
        ? typeof due === "string"
          ? due.includes("T")
            ? due
            : `${due}T00:00:00Z`
          : new Date(due).toISOString()
        : null;
    }
    return out as { id: string } & Partial<CreateOrderInput>;
  }

  const mutate = (payload: UpdateOrderClientPayload, opts?: Parameters<typeof m.mutate>[1]) =>
    (m as any).mutate(normalizeUpdateInput(payload), opts);
  const mutateAsync = (
    payload: UpdateOrderClientPayload,
    opts?: Parameters<typeof m.mutateAsync>[1]
  ) => (m as any).mutateAsync(normalizeUpdateInput(payload), opts);

  return {
    ...m,
    mutate,
    mutateAsync,
  } as Omit<typeof m, "mutate" | "mutateAsync"> & {
    mutate: (
      payload: UpdateOrderClientPayload,
      opts?: Parameters<typeof m.mutate>[1]
    ) => ReturnType<typeof m.mutate>;
    mutateAsync: (
      payload: UpdateOrderClientPayload,
      opts?: Parameters<typeof m.mutateAsync>[1]
    ) => ReturnType<typeof m.mutateAsync>;
  };
}

export function useDeleteOrder() {
  const utils = trpc.useUtils();
  return trpc.orders.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.orders.list.invalidate(),
        utils.invoices.list.invalidate(),
        utils.invalidate(),
      ]);
      toast.success("Order deleted successfully");
    },
    onError: (error: any) => toast.error(`Failed to delete order: ${error?.message}`),
  });
}
