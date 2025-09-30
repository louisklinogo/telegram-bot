"use client";

import { useState } from "react";
import { Download, Filter, MoreVertical, Plus, Ruler, Search } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MeasurementSheet } from "@/components/measurement-sheet";
import { DeleteMeasurementDialog } from "@/components/delete-measurement-dialog";
import { useMeasurements } from "@/hooks/use-supabase-data";
import type { MeasurementWithClient } from "@/lib/supabase-queries";

const GARMENT_TYPES = ["all", "kaftan", "shirt", "trouser", "suit", "agbada", "two_piece"] as const;

export default function MeasurementsPage() {
  const { data: measurements = [], isLoading } = useMeasurements();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState<MeasurementWithClient | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [garmentFilter, setGarmentFilter] = useState<typeof GARMENT_TYPES[number]>("all");

  // Filter measurements
  const filteredMeasurements = measurements.filter((m) => {
    const matchesSearch = 
      m.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.record_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGarment = garmentFilter === "all" || m.garment_type === garmentFilter;
    
    return matchesSearch && matchesGarment;
  });

  const handleEdit = (measurement: MeasurementWithClient) => {
    setSelectedMeasurement(measurement);
    setSheetOpen(true);
  };

  const handleDelete = (measurement: MeasurementWithClient) => {
    setSelectedMeasurement(measurement);
    setDeleteDialogOpen(true);
  };

  const handleNewMeasurement = () => {
    setSelectedMeasurement(null);
    setSheetOpen(true);
  };

  const getMeasurementSummary = (measurements: Record<string, string> | unknown) => {
    if (!measurements || typeof measurements !== "object") return "No measurements";
    const entries = Object.entries(measurements as Record<string, string>);
    if (entries.length === 0) return "No measurements";
    
    const preview = entries
      .slice(0, 3)
      .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}"`)
      .join(", ");
    
    if (entries.length > 3) {
      return `${preview} +${entries.length - 3} more`;
    }
    return preview;
  };

  return (
    <div className="flex flex-col gap-6 px-6">
      {/* Header with Search and Actions */}
      <div className="flex justify-between py-6">
        <div className="hidden items-center gap-2 rounded-md border px-3 py-1.5 text-sm md:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search measurements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
          <Button size="sm" className="gap-2" onClick={handleNewMeasurement}>
            <Plus className="h-4 w-4" /> New Measurement
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Measurements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{measurements.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All time records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {measurements.filter((m) => {
                const date = new Date(m.created_at);
                const now = new Date();
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
              }).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Recent measurements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unique Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(measurements.map((m) => m.client_id).filter(Boolean)).size}
            </div>
            <p className="text-xs text-muted-foreground mt-1">With measurements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Most Common
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {(() => {
                const counts = measurements.reduce((acc, m) => {
                  const type = m.garment_type || "other";
                  acc[type] = (acc[type] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                const max = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
                return max?.[0] || "None";
              })()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Garment type</p>
          </CardContent>
        </Card>
      </div>

      {/* Measurements Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Measurements</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Complete measurement records for all clients
              </p>
            </div>
            <Tabs value={garmentFilter} onValueChange={(v) => setGarmentFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="kaftan">Kaftan</TabsTrigger>
                <TabsTrigger value="shirt">Shirt</TabsTrigger>
                <TabsTrigger value="trouser">Trouser</TabsTrigger>
                <TabsTrigger value="suit">Suit</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : filteredMeasurements.length === 0 ? (
            <div className="text-center py-12">
              <div className="rounded-full bg-muted p-6 w-fit mx-auto mb-4">
                <Ruler className="h-12 w-12 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {searchQuery || garmentFilter !== "all" 
                  ? "No measurements match your filters"
                  : "No measurements found"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first measurement to get started
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Garment Type</TableHead>
                  <TableHead>Record Name</TableHead>
                  <TableHead>Measurements</TableHead>
                  <TableHead>Date Taken</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMeasurements.map((measurement) => (
                  <TableRow 
                    key={measurement.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEdit(measurement)}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{measurement.client?.name || "Unknown"}</p>
                        {measurement.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {measurement.notes}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {measurement.garment_type || "Other"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {measurement.record_name || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground line-clamp-1 max-w-xs">
                        {getMeasurementSummary(measurement.measurements)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {measurement.taken_at
                          ? new Date(measurement.taken_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : new Date(measurement.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(measurement);
                          }}>
                            <Ruler className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(measurement);
                            }}
                            className="text-destructive"
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
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        measurement={selectedMeasurement}
      />

      <DeleteMeasurementDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        measurement={selectedMeasurement}
      />
    </div>
  );
}
