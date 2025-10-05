"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteMeasurement } from "@/hooks/use-measurement-mutations";
import type { MeasurementWithClient } from "@/lib/supabase-queries";

interface DeleteMeasurementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  measurement: MeasurementWithClient | null;
}

export function DeleteMeasurementDialog({
  open,
  onOpenChange,
  measurement,
}: DeleteMeasurementDialogProps) {
  const deleteMutation = useDeleteMeasurement();

  const handleDelete = async () => {
    if (!measurement) return;

    await (deleteMutation as any).mutateAsync({ id: measurement.id });
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the measurement
            {measurement?.record_name && (
              <>
                {" "}
                (<span className="font-semibold">{measurement.record_name}</span>)
              </>
            )}
            {measurement?.client && (
              <>
                {" "}
                for <span className="font-semibold">{measurement.client.name}</span>
              </>
            )}
            . This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Measurement"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
