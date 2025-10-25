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
            <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
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
      const measurements = (row.original as any).measurements as Record<string, string> | null;
      if (!measurements || Object.keys(measurements).length === 0) {
        return (
          <span className="text-muted-foreground text-xs italic">No measurements recorded</span>
        );
      }

      // Display top 3 measurements
      const entries = Object.entries(measurements).slice(0, 3);
      return (
        <div className="space-y-1">
          {entries.map(([key, value]) => (
            <div className="flex items-baseline gap-1.5 text-xs" key={key}>
              <span className="min-w-[80px] text-muted-foreground capitalize">
                {key.replace(/_/g, " ")}:
              </span>
              <span className="font-mono font-semibold">{value}"</span>
            </div>
          ))}
          {Object.keys(measurements).length > 3 && (
            <p className="text-muted-foreground text-xs italic">
              +{Object.keys(measurements).length - 3} more...
            </p>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "taken_at",
    header: ({ column }) => (
      <Button
        className="-ml-4 h-8"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        variant="ghost"
      >
        Taken
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const takenAt = row.original.taken_at;
      if (!takenAt) return <span className="text-muted-foreground text-sm">Not specified</span>;

      return (
        <span className="text-muted-foreground text-sm">
          {formatDistanceToNow(new Date(takenAt), {
            addSuffix: true,
          })}
        </span>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button
        className="-ml-4 h-8"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        variant="ghost"
      >
        Created
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {formatDistanceToNow(new Date(row.original.created_at), {
          addSuffix: true,
        })}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const measurement = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8 w-8 p-0" size="sm" variant="ghost">
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
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => options?.onDelete?.(measurement)}
            >
              Delete measurement
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
