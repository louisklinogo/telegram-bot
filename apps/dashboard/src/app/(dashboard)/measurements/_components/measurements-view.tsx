"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Download, Filter, MoreVertical, Plus, Ruler, Search, X } from "lucide-react";
import { useQueryState } from "nuqs";
import { useMemo, useState } from "react";
import { DeleteMeasurementDialog } from "@/components/delete-measurement-dialog";
import { EmptyState } from "@/components/empty-state";
import { MeasurementSheet } from "@/components/measurement-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type MeasurementRow = {
  id: string;
  record_name?: string | null;
  version?: number | null;
  is_active?: boolean | null;
  tags?: string[] | null;
  measurements?: Record<string, string>;
  notes?: string | null;
  taken_at?: string | Date | null;
  created_at?: string | Date | null;
  client?: { name?: string | null } | null;
};

type MeasurementsViewProps = {
  initialMeasurements?: any[];
};

export function MeasurementsView({ initialMeasurements = [] }: MeasurementsViewProps) {
  // URL-based search state (shareable!)
  const [search, setSearch] = useQueryState("q", { defaultValue: "" });
  const [tagFilter, setTagFilter] = useQueryState("tag", { defaultValue: "" });
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // ✅ CORRECT: Use initialData from server
  const [data = []] = trpc.measurements.list.useSuspenseQuery(
    {},
    {
      initialData: initialMeasurements,
    }
  );

  const rows = useMemo<MeasurementRow[]>(
    () =>
      (data as any[]).map(({ measurement, client }) => ({
        id: measurement.id,
        record_name: (measurement as any).recordName ?? null,
        version: (measurement as any).version ?? null,
        is_active: (measurement as any).isActive ?? null,
        tags: (measurement as any).tags ?? null,
        measurements: (measurement as any).measurements ?? {},
        notes: measurement.notes ?? null,
        taken_at: (measurement as any).takenAt ?? null,
        created_at: (measurement as any).createdAt ?? null,
        client: client ? { name: client.name } : null,
      })),
    [data]
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState<MeasurementRow | null>(null);

  const filtered = rows.filter((m) => {
    const matchesSearch =
      m.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (m.record_name || "").toLowerCase().includes(search.toLowerCase());

    const matchesTag = !tagFilter || (m.tags && m.tags.includes(tagFilter));

    const matchesActive = !showActiveOnly || m.is_active === true;

    return matchesSearch && matchesTag && matchesActive;
  });

  const getMeasurementSummary = (measurements: Record<string, string> | unknown) => {
    if (!measurements || typeof measurements !== "object") return "No measurements";
    const entries = Object.entries(measurements as Record<string, string>);
    if (entries.length === 0) return "No measurements";
    const preview = entries
      .slice(0, 3)
      .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`)
      .join(", ");
    if (entries.length > 3) return `${preview} +${entries.length - 3} more`;
    return preview;
  };

  const handleTagClick = (tag: string) => {
    if (tagFilter === tag) {
      setTagFilter(""); // Clear filter if clicking same tag
    } else {
      setTagFilter(tag);
    }
  };

  const handleEdit = (measurement: MeasurementRow) => {
    setSelectedMeasurement(measurement);
    setSheetOpen(true);
  };

  const handleDelete = (measurement: MeasurementRow) => {
    setSelectedMeasurement(measurement);
    setDeleteDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedMeasurement(null);
    setSheetOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 px-6">
      <div className="flex flex-col gap-4 py-6">
        <div className="flex justify-between">
          <div className="relative hidden md:block">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="w-[350px] pl-9"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client or record name..."
              value={search}
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              onClick={() => setShowActiveOnly(!showActiveOnly)}
              size="sm"
              variant={showActiveOnly ? "default" : "outline"}
            >
              {showActiveOnly ? "Active Only" : "All Versions"}
            </Button>
            <Button className="gap-2" size="sm" variant="outline">
              <Filter className="h-4 w-4" /> Filters
            </Button>
            <Button className="gap-2" size="sm" variant="outline">
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button className="gap-2" onClick={handleNew} size="sm">
              <Plus className="h-4 w-4" /> New Measurement
            </Button>
          </div>
        </div>

        {/* Active tag filter */}
        {tagFilter && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Filtered by tag:</span>
            <Badge className="gap-1 pr-1" variant="secondary">
              <span>{tagFilter}</span>
              <button
                className="rounded-full p-0.5 hover:bg-muted"
                onClick={() => setTagFilter("")}
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              Total Measurements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{rows.length}</div>
            <p className="mt-1 text-muted-foreground text-xs">All time records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {
                rows.filter((m) => {
                  const date = new Date((m.created_at as any) || Date.now());
                  const now = new Date();
                  return (
                    date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
                  );
                }).length
              }
            </div>
            <p className="mt-1 text-muted-foreground text-xs">Recent measurements</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              Unique Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {new Set(rows.map((m) => (m as any).client_id).filter(Boolean)).size}
            </div>
            <p className="mt-1 text-muted-foreground text-xs">With measurements</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              Active Versions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {rows.filter((m) => m.is_active === true).length}
            </div>
            <p className="mt-1 text-muted-foreground text-xs">Current active measurements</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>All Measurements</CardTitle>
            <p className="mt-1 text-muted-foreground text-sm">
              {showActiveOnly
                ? "Showing only active measurement versions"
                : "Complete measurement records for all clients"}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {/* Empty States - Exact Midday Design */}
          {filtered.length === 0 && (search || tagFilter || showActiveOnly) && (
            <EmptyState
              action={{
                label: "Clear filters",
                onClick: () => {
                  setSearch("");
                  setTagFilter("");
                  setShowActiveOnly(false);
                },
              }}
              description="Try another search, or adjusting the filters"
              title="No results"
            />
          )}

          {filtered.length === 0 && !search && !tagFilter && !showActiveOnly && (
            <EmptyState
              action={{
                label: "Create measurement",
                onClick: handleNew,
              }}
              description={
                <>
                  You haven't created any measurements yet. <br />
                  Go ahead and create your first one.
                </>
              }
              title="No measurements"
            />
          )}

          {filtered.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Record Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Measurements</TableHead>
                  <TableHead>Date Taken</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    key={m.id}
                    onClick={() => handleEdit(m)}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{m.client?.name || "Unknown"}</p>
                        {m.notes && (
                          <p className="line-clamp-1 text-muted-foreground text-xs">{m.notes}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{m.record_name || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge className="text-xs" variant="outline">
                          v{m.version || 1}
                        </Badge>
                        {m.is_active && (
                          <Badge className="text-xs" variant="default">
                            Active
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {m.tags && m.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {m.tags.slice(0, 2).map((tag: string, idx: number) => (
                            <Badge
                              className="cursor-pointer text-xs hover:opacity-80"
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTagClick(tag);
                              }}
                              variant={tagFilter === tag ? "default" : "secondary"}
                            >
                              {tag}
                            </Badge>
                          ))}
                          {m.tags.length > 2 && (
                            <Badge className="text-xs" variant="outline">
                              +{m.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="line-clamp-1 max-w-xs text-muted-foreground text-sm">
                        {getMeasurementSummary(m.measurements || {})}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">
                        {m.taken_at
                          ? new Date(m.taken_at as any).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : new Date((m.created_at as any) || Date.now()).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button className="h-8 w-8 p-0" size="sm" variant="ghost">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(m);
                            }}
                          >
                            <Ruler className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(m);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MeasurementSheet
        measurement={selectedMeasurement as any}
        onOpenChange={setSheetOpen}
        open={sheetOpen}
      />
      <DeleteMeasurementDialog
        measurement={selectedMeasurement as any}
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
      />
    </div>
  );
}
