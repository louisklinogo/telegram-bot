"use client";

import { formatDistanceToNow } from "date-fns";
import { Download, ExternalLink, MoreVertical } from "lucide-react";

import type { InvoiceWithOrder } from "@/lib/supabase-queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InvoicesTableProps {
  invoices: InvoiceWithOrder[];
  isLoading?: boolean;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  pending: "secondary",
  sent: "secondary",
  paid: "default",
  overdue: "destructive",
  cancelled: "outline",
};

export function InvoicesTable({ invoices, isLoading }: InvoicesTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`skeleton-${i}`} className="flex items-center gap-4 rounded-lg border p-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (!invoices?.length) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">No invoices found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">Invoice #</TableHead>
            <TableHead>Order / Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-32">Issued</TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">
                    {invoice.order?.order_number || "Unknown Order"}
                  </p>
                  {invoice.order?.client && (
                    <p className="text-xs text-muted-foreground">
                      {invoice.order.client.name}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[invoice.status] || "outline"}>
                  {invoice.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                ₵{invoice.amount.toLocaleString()}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(invoice.issued_at), { addSuffix: true })}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem disabled={!invoice.pdf_url}>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View order
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Mark as paid</DropdownMenuItem>
                    <DropdownMenuItem>Send reminder</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Cancel invoice</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
