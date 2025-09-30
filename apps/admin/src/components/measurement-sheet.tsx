"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { useCreateMeasurement, useUpdateMeasurement } from "@/hooks/use-measurement-mutations";
import { useClients } from "@/hooks/use-supabase-data";
import type { MeasurementWithClient } from "@/lib/supabase-queries";

// All measurement fields - shown for every client
const MEASUREMENT_FIELDS: Record<string, { label: string; code: string; placeholder: string }> = {
  chest: { label: "Chest (CH)", code: "chest", placeholder: "e.g., 42 or 42/44" },
  stomach: { label: "Stomach (ST)", code: "stomach", placeholder: "e.g., 40 or 40/42" },
  waist: { label: "Waist (WT)", code: "waist", placeholder: "e.g., 36 or 36/38" },
  hips: { label: "Hip (HP)", code: "hips", placeholder: "e.g., 42 or 42/44" },
  lap: { label: "Lap (LP)", code: "lap", placeholder: "e.g., 24 or 24/26" },
  neck: { label: "Neck (NK)", code: "neck", placeholder: "e.g., 16.5 or 16.5/17" },
  shoulder: { label: "Shoulder (SH)", code: "shoulder", placeholder: "e.g., 19 or 19/20" },
  top_length: { label: "Top Length (TL)", code: "top_length", placeholder: "e.g., 48 or 48/50" },
  pant_length: { label: "Pant Length (PL)", code: "pant_length", placeholder: "e.g., 42 or 42/44" },
  sleeve_length: { label: "Sleeve Length (SL)", code: "sleeve_length", placeholder: "e.g., 25 or 25/26" },
  bicep_round: { label: "Bicep Round (BR)", code: "bicep_round", placeholder: "e.g., 15 or 15/16" },
  ankle_round: { label: "Ankle Round (AR)", code: "ankle_round", placeholder: "e.g., 11 or 11/12" },
  calf: { label: "Calf (CF)", code: "calf", placeholder: "e.g., 14 or 14/15" },
  thigh: { label: "Thigh (TH)", code: "thigh", placeholder: "e.g., 24 or 24/26" },
  knee: { label: "Knee (KN)", code: "knee", placeholder: "e.g., 18 or 18/19" },
  back_length: { label: "Back Length (BL)", code: "back_length", placeholder: "e.g., 32 or 32/34" },
  jacket_length: { label: "Jacket Length (JL)", code: "jacket_length", placeholder: "e.g., 30 or 30/32" },
};

// Field order for display (all fields, always shown)
const FIELD_ORDER = [
  "chest", "stomach", "waist", "hips", "lap", "neck", "shoulder",
  "top_length", "pant_length", "sleeve_length", "bicep_round", "ankle_round",
  "calf", "thigh", "knee", "back_length", "jacket_length"
];

interface MeasurementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  measurement?: MeasurementWithClient | null;
}

export function MeasurementSheet({ open, onOpenChange, measurement }: MeasurementSheetProps) {
  const { data: clients = [] } = useClients();
  const createMutation = useCreateMeasurement();
  const updateMutation = useUpdateMeasurement();

  const [formData, setFormData] = useState({
    client_id: measurement?.client_id || "",
    record_name: measurement?.record_name || "",
    notes: measurement?.notes || "",
    taken_at: measurement?.taken_at ? new Date(measurement.taken_at).toISOString().split("T")[0] : "",
  });

  const [measurements, setMeasurements] = useState<Record<string, string>>(
    measurement?.measurements && typeof measurement.measurements === "object"
      ? (measurement.measurements as Record<string, string>)
      : {}
  );

  const isEdit = !!measurement;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Reset form when measurement changes
  useEffect(() => {
    if (measurement && open) {
      setFormData({
        client_id: measurement.client_id || "",
        record_name: measurement.record_name || "",
        garment_type: measurement.garment_type || "kaftan",
        notes: measurement.notes || "",
        taken_at: measurement.taken_at ? new Date(measurement.taken_at).toISOString().split("T")[0] : "",
      });
      setMeasurements(
        measurement.measurements && typeof measurement.measurements === "object"
          ? (measurement.measurements as Record<string, string>)
          : {}
      );
    } else if (!open) {
      // Reset on close
      setFormData({
        client_id: "",
        record_name: "",
        garment_type: "kaftan",
        notes: "",
        taken_at: "",
      });
      setMeasurements({});
    }
  }, [measurement, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id) return;

    const measurementData = {
      ...formData,
      measurements: measurements,
      taken_at: formData.taken_at || new Date().toISOString(),
    };

    try {
      if (isEdit && measurement) {
        await updateMutation.mutateAsync({
          id: measurement.id,
          data: measurementData,
        });
      } else {
        await createMutation.mutateAsync(measurementData);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save measurement:", error);
    }
  };

  const updateMeasurement = (field: string, value: string) => {
    setMeasurements((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Measurement" : "New Measurement"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update measurement details below" : "Enter dual values like 42/44 for loose/tight fit"}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="client">
              Client <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              required
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Record Name */}
          <div className="space-y-2">
            <Label htmlFor="record_name">Record Name</Label>
            <Input
              id="record_name"
              value={formData.record_name}
              onChange={(e) => setFormData({ ...formData, record_name: e.target.value })}
              placeholder="e.g., Wedding Kaftan 2024"
            />
            <p className="text-xs text-muted-foreground">Optional: Name this measurement set for reference</p>
          </div>

          {/* Garment Type */}
          <div className="space-y-2">
            <Label htmlFor="garment_type">
              Garment Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.garment_type}
              onValueChange={(value) => setFormData({ ...formData, garment_type: value })}
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kaftan">Kaftan</SelectItem>
                <SelectItem value="shirt">Shirt</SelectItem>
                <SelectItem value="trouser">Trouser</SelectItem>
                <SelectItem value="suit">Suit</SelectItem>
                <SelectItem value="agbada">Agbada</SelectItem>
                <SelectItem value="two_piece">Two Piece</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* All Measurement Fields */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>All Measurements (inches)</Label>
              <span className="text-xs text-muted-foreground">Fill in relevant fields</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {FIELD_ORDER.map((fieldCode) => {
                const field = MEASUREMENT_FIELDS[fieldCode];
                if (!field) return null;

                return (
                  <div key={fieldCode} className="space-y-1.5">
                    <Label htmlFor={fieldCode} className="text-sm">
                      {field.label}
                    </Label>
                    <Input
                      id={fieldCode}
                      value={measurements[fieldCode] || ""}
                      onChange={(e) => updateMeasurement(fieldCode, e.target.value)}
                      placeholder={field.placeholder}
                      className="h-9"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Taken At Date */}
          <div className="space-y-2">
            <Label htmlFor="taken_at">Date Taken</Label>
            <Input
              id="taken_at"
              type="date"
              value={formData.taken_at}
              onChange={(e) => setFormData({ ...formData, taken_at: e.target.value })}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this measurement..."
              rows={3}
            />
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.client_id}>
              {isLoading ? "Saving..." : isEdit ? "Update Measurement" : "Create Measurement"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
