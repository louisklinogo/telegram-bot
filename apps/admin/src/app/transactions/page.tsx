"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTransactions, useTransactionStats } from "@/hooks/use-supabase-data";
import { Download, Filter, Plus, Search } from "lucide-react";
import { useState } from "react";
import type { TransactionRecord } from "@/lib/supabase-transactions";

export default function TransactionsPage() {
  const { data: transactions = [], isLoading } = useTransactions();
  const { data: stats, isLoading: statsLoading } = useTransactionStats();
  const [filterType, setFilterType] = useState<"all" | TransactionRecord["type"]>("all");

  const filteredTransactions =
    filterType === "all"
      ? transactions
      : transactions.filter((t) => t.type === filterType);

  return (
    <div className="flex flex-col gap-6 px-6">
      {/* Header with Search and Actions */}
      <div className="flex justify-between py-6">
        <div className="hidden items-center gap-2 rounded-md border px-3 py-1.5 text-sm md:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            className="h-6 w-[350px] border-none bg-transparent p-0 text-sm focus-visible:ring-0"
          />
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" /> Filters
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> New Transaction
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₵{stats?.totalIncome.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">All time payments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₵{stats?.totalExpenses.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">All time expenses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₵{stats?.netProfit.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Income minus expenses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₵{stats?.pendingPayments.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting collection</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                All financial movements and transactions
              </p>
            </div>
            <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="payment">Payments</TabsTrigger>
                <TabsTrigger value="expense">Expenses</TabsTrigger>
                <TabsTrigger value="refund">Refunds</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No transactions found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first transaction to get started
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {new Date(transaction.transaction_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{transaction.description}</p>
                        {transaction.payment_reference && (
                          <p className="text-xs text-muted-foreground">
                            Ref: {transaction.payment_reference}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{transaction.client?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transaction.type === "payment"
                            ? "default"
                            : transaction.type === "expense"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {transaction.category || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {transaction.payment_method || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transaction.status === "completed"
                            ? "default"
                            : transaction.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      <span
                        className={
                          transaction.type === "payment"
                            ? "text-green-600"
                            : transaction.type === "expense"
                              ? "text-red-600"
                              : ""
                        }
                      >
                        {transaction.type === "expense" && "-"}
                        {transaction.currency}
                        {transaction.amount.toLocaleString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
