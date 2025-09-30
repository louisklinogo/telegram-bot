"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpDown, MoreVertical, Ruler } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MeasurementWithClient } from "@/lib/supabase-queries";

export type MeasurementColumn = MeasurementWithClient;

interface CreateColumnsOptions {
  onEdit?: (measurement: MeasurementColumn) => void;
  onDelete?: (measurement: MeasurementColumn) => void;
}

export const createColumns = (options?: CreateColumnsOptions): ColumnDef<MeasurementColumn>[] => [
  {
    accessorKey: "client",
    header: "Client / Version",
    cell: ({ row }) => {
      const measurement = row.original;
      return (
        <div className="space-y-1">
          <p className="font-medium text-sm">{measurement.client?.name || "Unknown Client"}</p>
          {measurement.record_name && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Ruler className="h-3 w-3" />
              {measurement.record_name}
            </p>
          )}
        </div>
      );
    },
  },
  {
    id: "key_measurements",
    header: "Key Measurements",
    cell: ({ row }) => {
      const measurements = row.original.measurements as Record<string, string> | null;
      if (!measurements || Object.keys(measurements).length === 0) {
        return <span className="text-xs text-muted-foreground italic">No measurements recorded</span>;
      }

      // Display top 3 measurements
      const entries = Object.entries(measurements).slice(0, 3);
      return (
        <div className="space-y-1">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-baseline gap-1.5 text-xs">
              <span className="text-muted-foreground capitalize min-w-[80px]">{key.replace(/_/g, " ")}:</span>
              <span className="font-mono font-semibold">{value}"</span>
            </div>
          ))}
          {Object.keys(measurements).length > 3 && (
            <p className="text-xs text-muted-foreground italic">+{Object.keys(measurements).length - 3} more...</p>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "taken_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8"
        >
          Taken
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const takenAt = row.original.taken_at;
      if (!takenAt) return <span className="text-muted-foreground text-sm">Not specified</span>;

      return (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(takenAt), {
            addSuffix: true,
          })}
        </span>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8"
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.created_at), {
            addSuffix: true,
          })}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const measurement = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => options?.onEdit?.(measurement)}>
              <Ruler className="mr-2 h-4 w-4" />
              Edit measurement
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => options?.onDelete?.(measurement)} className="text-destructive">
              Delete measurement
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
