"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Filter, MoreVertical, Plus, Search, X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useQueryState } from "nuqs";
import { useInView } from "react-intersection-observer";
import { ClientSheet } from "@/components/client-sheet";
import { LoadMore } from "@/components/load-more";
import { DeleteClientDialog } from "@/components/delete-client-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc/client";
import { EmptyState } from "@/components/empty-state";
import { MostActiveClient } from "@/components/analytics/most-active-client";
import { InactiveClients } from "@/components/analytics/inactive-clients";
import { TopRevenueClient } from "@/components/analytics/top-revenue-client";
import { NewClientsThisMonth } from "@/components/analytics/new-clients-this-month";
import { ColumnVisibility } from "@/components/column-visibility";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionsBar } from "@/components/bulk-actions-bar";
import { FilterSheet, type FilterOptions } from "@/components/filter-sheet";
import { CSVUpload } from "@/components/csv-upload";
import { Badge } from "@/components/ui/badge";
import Papa from "papaparse";
import { toast } from "sonner";
import { Suspense } from "react";
import { useCreateClient } from "@/hooks/use-client-mutations";
import { cn } from "@/lib/utils";
import { useTeamCurrency } from "@/hooks/use-team-currency";
import { formatAmount } from "@/lib/format-currency";

type Client = {
  id: string;
  teamId: string;
  name: string;
  phone: string | null;
  whatsapp: string;
  email: string | null;
  address: string | null;
  country: string | null;
  countryCode: string | null;
  company: string | null;
  occupation: string | null;
  referralSource: string | null;
  tags: string[] | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  // Enriched fields
  ordersCount?: number;
  totalRevenue?: string;
  lastOrderDate?: Date | null;
};

type ClientsViewProps = {
  initialClients?: Client[];
};

// Column configuration
const DEFAULT_COLUMNS = [
  { id: "name", label: "Name", visible: true },
  { id: "phone", label: "Phone", visible: true },
  { id: "whatsapp", label: "WhatsApp", visible: true },
  { id: "orders", label: "Orders", visible: true },
  { id: "revenue", label: "Revenue", visible: true },
  { id: "tags", label: "Tags", visible: true },
  { id: "lastOrder", label: "Last Order", visible: true },
];

export function ClientsView({ initialClients = [] }: ClientsViewProps) {
  const currency = useTeamCurrency();
  // URL-based search state (shareable!)
  const [search, setSearch] = useQueryState("q", { defaultValue: "" });
  const [tagFilter, setTagFilter] = useQueryState("tag", { defaultValue: "" });

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // Checkbox selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter state
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({});

  // Column visibility state (persisted to localStorage)
  const [columns, setColumns] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("clients-columns");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return DEFAULT_COLUMNS;
        }
      }
    }
    return DEFAULT_COLUMNS;
  });

  // Save column visibility to localStorage
  const handleToggleColumn = (columnId: string) => {
    const updated = columns.map((col: any) =>
      col.id === columnId ? { ...col, visible: !col.visible } : col,
    );
    setColumns(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("clients-columns", JSON.stringify(updated));
    }
  };

  // Helper to check if column is visible
  const isColumnVisible = (columnId: string) => {
    const column = columns.find((col: any) => col.id === columnId);
    return column?.visible ?? true;
  };

  // Infinite scrolling setup
  const { ref, inView } = useInView();
  const utils = trpc.useUtils();

  // Table horizontal scroll with gradients
  const tableScroll = useTableScroll();

  // CSV import mutation
  const createClientMutation = useCreateClient();

  // ✅ CORRECT: Use initialData with infinite query
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useSuspenseInfiniteQuery({
      queryKey: ["clients.list", { search: search || undefined }],
      queryFn: async ({ pageParam }) => {
        const result = await utils.client.clients.list.query({
          search: search || undefined,
          limit: 50,
          cursor: pageParam as string | undefined,
        });
        return result;
      },
      getNextPageParam: (lastPage: any) => lastPage.nextCursor,
      initialPageParam: undefined,
      initialData:
        initialClients.length > 0
          ? {
              pages: [{ items: initialClients, nextCursor: undefined }],
              pageParams: [undefined],
            }
          : undefined,
      staleTime: 0, // Always refetch on mount
      refetchOnMount: true,
    });

  // Flatten all pages into single array
  const clients = useMemo(() => {
    return data?.pages.flatMap((page: any) => page.items) ?? [];
  }, [data]);

  // Client-side filtering (search, tags, advanced filters)
  const filteredClients = useMemo(() => {
    let result = clients;

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (c: any) =>
          c.name?.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower) ||
          c.phone?.includes(search) ||
          c.whatsapp?.includes(search),
      );
    }

    // Apply tag filter
    if (tagFilter) {
      result = result.filter((c: any) => c.tags && c.tags.includes(tagFilter));
    }

    // Apply referral source filter
    if (activeFilters.referralSource) {
      result = result.filter(
        (c: any) => c.referralSource?.toLowerCase() === activeFilters.referralSource?.toLowerCase(),
      );
    }

    // Apply has orders filter
    if (activeFilters.hasOrders !== undefined) {
      result = result.filter((c: any) =>
        activeFilters.hasOrders ? (c.ordersCount || 0) > 0 : (c.ordersCount || 0) === 0,
      );
    }

    // Apply min revenue filter
    if (activeFilters.minRevenue) {
      result = result.filter((c: any) => Number(c.totalRevenue || 0) >= activeFilters.minRevenue!);
    }

    // Apply max revenue filter
    if (activeFilters.maxRevenue) {
      result = result.filter((c: any) => Number(c.totalRevenue || 0) <= activeFilters.maxRevenue!);
    }

    return result;
  }, [clients, search, tagFilter, activeFilters]);

  const handleTagClick = (tag: string) => {
    if (tagFilter === tag) {
      setTagFilter(""); // Clear filter if clicking same tag
    } else {
      setTagFilter(tag);
    }
  };

  // Trigger fetch when scrolling to bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setSheetOpen(true);
  };

  const handleDelete = (client: Client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedClient(null);
    setSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setSelectedClient(null);
  };

  // Checkbox selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredClients.map((c: any) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  // Bulk action handlers
  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (!confirm(`Delete ${count} client${count > 1 ? "s" : ""}? This cannot be undone.`)) {
      return;
    }

    const deleteMutation = trpc.clients.delete.useMutation();
    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      try {
        await utils.client.clients.delete.mutate({ id });
        successCount++;
      } catch (error) {
        errorCount++;
        console.error("Failed to delete client:", id, error);
      }
    }

    setSelectedIds(new Set());

    if (successCount > 0) {
      toast.success(`Deleted ${successCount} client${successCount > 1 ? "s" : ""}`);
      refetch();
    }
    if (errorCount > 0) {
      toast.error(`Failed to delete ${errorCount} client${errorCount > 1 ? "s" : ""}`);
    }
  };

  const handleBulkCopy = () => {
    const selected = filteredClients.filter((c: any) => selectedIds.has(c.id));
    const text = selected
      .map((c: any) => `${c.name}\t${c.phone || ""}\t${c.whatsapp}\t${c.email || ""}`)
      .join("\n");

    navigator.clipboard.writeText(text);
    toast.success(
      `Copied ${selectedIds.size} client${selectedIds.size > 1 ? "s" : ""} to clipboard`,
    );
  };

  const handleBulkExport = () => {
    const selected = filteredClients.filter((c: any) => selectedIds.has(c.id));
    const exportData = selected.map((c: any) => ({
      name: c.name,
      phone: c.phone || "",
      whatsapp: c.whatsapp,
      email: c.email || "",
      address: c.address || "",
      country: c.country || "",
      countryCode: c.countryCode || "",
      company: c.company || "",
      occupation: c.occupation || "",
      referralSource: c.referralSource || "",
      tags: c.tags?.join(",") || "",
      notes: c.notes || "",
      ordersCount: c.ordersCount || 0,
      totalRevenue: c.totalRevenue || 0,
      lastOrderDate: c.lastOrderDate || "",
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success(`Exported ${selectedIds.size} client${selectedIds.size > 1 ? "s" : ""}`);
  };

  // CSV import handler
  const handleCSVUpload = async (data: any[]) => {
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const row of data) {
      // Validate required fields
      if (!row.name || !row.whatsapp) {
        errorCount++;
        errors.push(`Row missing required fields: ${row.name || "Unknown"}`);
        continue;
      }

      try {
        await createClientMutation.mutateAsync({
          name: row.name,
          phone: row.phone || null,
          whatsapp: row.whatsapp,
          email: row.email || null,
          address: row.address || null,
          country: row.country || null,
          countryCode: row.countryCode || null,
          company: row.company || null,
          occupation: row.occupation || null,
          referralSource: row.referralSource || row.referral_source || null,
          tags: row.tags
            ? row.tags
                .split(",")
                .map((t: string) => t.trim())
                .filter(Boolean)
            : null,
          notes: row.notes || null,
        });
        successCount++;
      } catch (error: any) {
        errorCount++;
        errors.push(`Failed to import ${row.name}: ${error?.message || "Unknown error"}`);
        console.error("Failed to import client:", row.name, error);
      }
    }

    // Show results
    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} client${successCount > 1 ? "s" : ""}`);
    }
    if (errorCount > 0) {
      toast.error(
        `Failed to import ${errorCount} client${errorCount > 1 ? "s" : ""}. Check console for details.`,
      );
      console.error("Import errors:", errors);
    }
  };

  // Analytics card skeleton
  const AnalyticsCardSkeleton = () => (
    <Card>
      <CardHeader className="pb-3">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent className="pb-[34px]">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          <div className="h-4 w-40 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Analytics Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-6">
          <Suspense fallback={<AnalyticsCardSkeleton />}>
            <MostActiveClient />
          </Suspense>
          <Suspense fallback={<AnalyticsCardSkeleton />}>
            <InactiveClients />
          </Suspense>
          <Suspense fallback={<AnalyticsCardSkeleton />}>
            <TopRevenueClient />
          </Suspense>
          <Suspense fallback={<AnalyticsCardSkeleton />}>
            <NewClientsThisMonth />
          </Suspense>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clients by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <ColumnVisibility columns={columns} onToggle={handleToggleColumn} />
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setFilterSheetOpen(true)}
              >
                <Filter className="h-4 w-4" />
                Filters
                {Object.keys(activeFilters).length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center"
                  >
                    {Object.keys(activeFilters).length}
                  </Badge>
                )}
              </Button>
              <CSVUpload onUpload={handleCSVUpload} />
              <Button size="sm" className="gap-2" onClick={handleAddNew}>
                <Plus className="h-4 w-4" /> Add Client
              </Button>
            </div>
          </div>

          {/* Active tag filter */}
          {tagFilter && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filtered by tag:</span>
              <Badge variant="secondary" className="gap-1 pr-1">
                <span>{tagFilter}</span>
                <button
                  type="button"
                  onClick={() => setTagFilter("")}
                  className="hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            </div>
          )}
        </div>

        {/* Empty States - Exact Midday Design */}
        {filteredClients.length === 0 &&
          (search || tagFilter || Object.keys(activeFilters).length > 0) && (
            <EmptyState
              title="No results"
              description="Try another search, or adjusting the filters"
              action={{
                label: "Clear filters",
                onClick: () => {
                  setSearch("");
                  setTagFilter("");
                  setActiveFilters({});
                },
              }}
            />
          )}

        {filteredClients.length === 0 && !search && !tagFilter && (
          <EmptyState
            title="No customers"
            description={
              <>
                You haven't created any customers yet. <br />
                Go ahead and create your first one.
              </>
            }
            action={{
              label: "Create customer",
              onClick: handleAddNew,
            }}
          />
        )}

        {/* Table with horizontal scroll */}
        {filteredClients.length > 0 && (
          <Card className="relative">
            {/* Left gradient */}
            {tableScroll.canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-[15] pointer-events-none" />
            )}

            {/* Right gradient */}
            {tableScroll.canScrollRight && (
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-[15] pointer-events-none" />
            )}

            <div ref={tableScroll.containerRef} className="overflow-x-auto scrollbar-hide">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={
                          selectedIds.size === filteredClients.length && filteredClients.length > 0
                        }
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    {isColumnVisible("name") && (
                      <TableHead className="sticky left-[50px] bg-background z-20">Name</TableHead>
                    )}
                    {isColumnVisible("phone") && <TableHead>Phone</TableHead>}
                    {isColumnVisible("whatsapp") && <TableHead>WhatsApp</TableHead>}
                    {isColumnVisible("orders") && <TableHead>Orders</TableHead>}
                    {isColumnVisible("revenue") && <TableHead>Revenue</TableHead>}
                    {isColumnVisible("tags") && <TableHead>Tags</TableHead>}
                    {isColumnVisible("lastOrder") && <TableHead>Last Order</TableHead>}
                    <TableHead className="sticky right-0 bg-background z-20 w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client: any) => {
                    const isSelected = selectedIds.has(client.id);
                    return (
                      <TableRow
                        key={client.id}
                        className="cursor-pointer"
                        onClick={(e) => {
                          // Don't trigger if clicking on action menu or links
                          const target = e.target as HTMLElement;
                          if (!target.closest("button") && !target.closest("a")) {
                            handleEdit(client);
                          }
                        }}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(client.id)}
                            onCheckedChange={(checked) =>
                              handleSelectOne(client.id, checked as boolean)
                            }
                            aria-label={`Select ${client.name}`}
                          />
                        </TableCell>
                        {isColumnVisible("name") && (
                          <TableCell className="sticky left-[50px] z-20">
                            <div className="font-medium">{client.name}</div>
                            {client.notes && (
                              <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                                {client.notes}
                              </div>
                            )}
                          </TableCell>
                        )}
                        {isColumnVisible("phone") && (
                          <TableCell>
                            {client.phone ? (
                              <span className="font-mono text-sm">{client.phone}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )}
                        {isColumnVisible("whatsapp") && (
                          <TableCell>
                            <span className="font-mono text-sm">{client.whatsapp}</span>
                          </TableCell>
                        )}
                        {isColumnVisible("orders") && (
                          <TableCell>
                            {client.ordersCount && client.ordersCount > 0 ? (
                              <a
                                href={`/orders?client=${client.id}`}
                                className="text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {client.ordersCount}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                        )}
                        {isColumnVisible("revenue") && (
                          <TableCell>
                            {client.totalRevenue && Number(client.totalRevenue) > 0 ? (
                              <span className="font-medium">
                                {formatAmount({ currency, amount: Number(client.totalRevenue) })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{formatAmount({ currency, amount: 0 })}</span>
                            )}
                          </TableCell>
                        )}
                        {isColumnVisible("tags") && (
                          <TableCell>
                            {client.tags && client.tags.length > 0 ? (
                              <div className="flex gap-1 flex-wrap">
                                {client.tags.slice(0, 2).map((tag: string, idx: number) => (
                                  <Badge
                                    key={idx}
                                    variant={tagFilter === tag ? "default" : "secondary"}
                                    className="text-xs cursor-pointer hover:opacity-80"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTagClick(tag);
                                    }}
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {client.tags.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{client.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )}
                        {isColumnVisible("lastOrder") && (
                          <TableCell>
                            {client.lastOrderDate ? (
                              <span className="text-sm">
                                {new Date(client.lastOrderDate).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Never</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="sticky right-0 z-20">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEdit(client)}>
                                Edit Client
                              </DropdownMenuItem>
                              <DropdownMenuItem>View Orders</DropdownMenuItem>
                              <DropdownMenuItem>View Measurements</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(client)}
                                className="text-destructive"
                              >
                                Delete Client
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Load more trigger */}
            <LoadMore ref={ref} hasNextPage={hasNextPage} isFetchingNextPage={isFetchingNextPage} />
          </Card>
        )}
      </div>

      {/* Sheet for Create/Edit */}
      <ClientSheet
        open={sheetOpen}
        onOpenChange={handleCloseSheet}
        client={
          selectedClient
            ? {
                id: selectedClient.id,
                name: selectedClient.name,
                phone: selectedClient.phone,
                whatsapp: selectedClient.whatsapp,
                email: selectedClient.email,
                address: selectedClient.address,
                country: selectedClient.country,
                countryCode: selectedClient.countryCode,
                company: selectedClient.company,
                occupation: selectedClient.occupation,
                referral_source: selectedClient.referralSource,
                tags: selectedClient.tags,
                notes: selectedClient.notes,
              }
            : null
        }
      />

      {/* Delete Dialog */}
      {clientToDelete && (
        <DeleteClientDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          client={clientToDelete}
        />
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onDelete={handleBulkDelete}
        onCopy={handleBulkCopy}
        onExport={handleBulkExport}
        onClear={() => setSelectedIds(new Set())}
      />

      {/* Filter Sheet */}
      <FilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        onApplyFilters={setActiveFilters}
      />
    </>
  );
}
