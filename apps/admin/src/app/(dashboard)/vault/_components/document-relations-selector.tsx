"use client";

import { useState } from "react";
import { Label } from "@cimantikos/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type DocumentRelationsProps = {
  value: {
    orderId?: string;
    invoiceId?: string;
    clientId?: string;
  };
  onChange: (value: {
    orderId?: string;
    invoiceId?: string;
    clientId?: string;
  }) => void;
};

export function DocumentRelationsSelector({ value, onChange }: DocumentRelationsProps) {
  // Fetch orders, invoices, clients for selection
  const { data: ordersData } = trpc.orders.list.useQuery({ limit: 100 });
  const { data: invoicesData } = trpc.invoices.list.useQuery({ limit: 100 });
  const { data: clientsData } = trpc.clients.list.useQuery({ limit: 100 });

  const orders = ordersData?.items || [];
  const invoices = invoicesData?.items || [];
  const clients = clientsData?.items || [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Link to Order (Optional)</Label>
          {value.orderId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0"
              onClick={() => onChange({ ...value, orderId: undefined })}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Select
          value={value.orderId || "none"}
          onValueChange={(val) =>
            onChange({ ...value, orderId: val === "none" ? undefined : val })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an order..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {orders.map((order: any) => (
              <SelectItem key={order.id} value={order.id}>
                Order #{order.orderNumber || order.id.slice(0, 8)} - {order.clientName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Link to Invoice (Optional)</Label>
          {value.invoiceId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0"
              onClick={() => onChange({ ...value, invoiceId: undefined })}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Select
          value={value.invoiceId || "none"}
          onValueChange={(val) =>
            onChange({ ...value, invoiceId: val === "none" ? undefined : val })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an invoice..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {invoices.map((invoice: any) => (
              <SelectItem key={invoice.id} value={invoice.id}>
                Invoice #{invoice.invoiceNumber || invoice.id.slice(0, 8)} - {invoice.customerName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Link to Client (Optional)</Label>
          {value.clientId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0"
              onClick={() => onChange({ ...value, clientId: undefined })}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Select
          value={value.clientId || "none"}
          onValueChange={(val) =>
            onChange({ ...value, clientId: val === "none" ? undefined : val })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a client..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {clients.map((client: any) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
