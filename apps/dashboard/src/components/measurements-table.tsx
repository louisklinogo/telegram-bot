"use client";

import { createColumns, type MeasurementColumn } from "@/app/(dashboard)/measurements/columns";
import { DataTable } from "@/components/data-table";
import type { MeasurementWithClient } from "@/lib/supabase-queries";

interface MeasurementsTableProps {
  measurements: MeasurementWithClient[];
  isLoading?: boolean;
  onEdit?: (measurement: MeasurementColumn) => void;
  onDelete?: (measurement: MeasurementColumn) => void;
}

export function MeasurementsTable({
  measurements,
  isLoading,
  onEdit,
  onDelete,
}: MeasurementsTableProps) {
  const columns = createColumns({ onEdit, onDelete });

  return (
    <DataTable
      columns={columns}
      data={measurements}
      isLoading={isLoading}
      searchKey="client"
      searchPlaceholder="Search measurements by client..."
    />
  );
}
