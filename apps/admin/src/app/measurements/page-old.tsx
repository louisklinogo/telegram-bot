"use client";

import { useState } from "react";
import { Plus, Ruler } from "lucide-react";
import { MeasurementsTable } from "@/components/measurements-table";
import { MeasurementSheet } from "@/components/measurement-sheet";
import { DeleteMeasurementDialog } from "@/components/delete-measurement-dialog";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useMeasurements } from "@/hooks/use-supabase-data";
import type { MeasurementColumn } from "@/app/measurements/columns";

export default function MeasurementsPage() {
  const { data: measurements, isLoading } = useMeasurements();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState<MeasurementColumn | null>(null);

  const handleEdit = (measurement: MeasurementColumn) => {
    setSelectedMeasurement(measurement);
    setSheetOpen(true);
  };

  const handleDelete = (measurement: MeasurementColumn) => {
    setSelectedMeasurement(measurement);
    setDeleteDialogOpen(true);
  };

  const handleNewMeasurement = () => {
    setSelectedMeasurement(null);
    setSheetOpen(true);
  };

  const handleSheetClose = (open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      setSelectedMeasurement(null);
    }
  };

  const handleDeleteDialogClose = (open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setSelectedMeasurement(null);
    }
  };

  const headerActions = (
    <Button size="sm" className="gap-2" onClick={handleNewMeasurement}>
      <Plus className="h-4 w-4" /> New Measurement
    </Button>
  );

  return (
    <PageShell
      title="Measurements"
      description="Manage client measurements with support for dual values (e.g., 42/44)."
      headerActions={headerActions}
      className="space-y-6"
    >
      <MeasurementsTable
        measurements={measurements || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <MeasurementSheet
        open={sheetOpen}
        onOpenChange={handleSheetClose}
        measurement={selectedMeasurement}
      />

      <DeleteMeasurementDialog
        open={deleteDialogOpen}
        onOpenChange={handleDeleteDialogClose}
        measurement={selectedMeasurement}
      />
    </PageShell>
  );
}
