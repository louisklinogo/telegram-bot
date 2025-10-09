"use client";

import { useQueryState, parseAsString, parseAsStringEnum } from "nuqs";

/**
 * URL state management for invoice sheet
 * Pattern: /invoices?type=create&invoiceId=xxx&orderId=xxx
 */
export function useInvoiceParams() {
  const [type, setType] = useQueryState(
    "type",
    parseAsStringEnum(["create", "edit", "view"]).withDefault("view"),
  );

  const [invoiceId, setInvoiceId] = useQueryState("invoiceId", parseAsString);
  const [orderId, setOrderId] = useQueryState("orderId", parseAsString);

  const isOpen = type === "create" || type === "edit";

  const openCreate = (fromOrderId?: string) => {
    setType("create");
    setInvoiceId(null);
    if (fromOrderId) {
      setOrderId(fromOrderId);
    }
  };

  const openEdit = (id: string) => {
    setType("edit");
    setInvoiceId(id);
    setOrderId(null);
  };

  const close = () => {
    setType("view");
    setInvoiceId(null);
    setOrderId(null);
  };

  return {
    type,
    invoiceId,
    orderId,
    isOpen,
    openCreate,
    openEdit,
    close,
  };
}
