"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { MeasurementSelector } from "@/components/measurement-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MeasurementEntry = {
  key: string;
  value: string;
};

type DynamicMeasurementInputProps = {
  measurements: Record<string, string>;
  onChange: (measurements: Record<string, string>) => void;
  className?: string;
};

export function DynamicMeasurementInput({
  measurements,
  onChange,
  className,
}: DynamicMeasurementInputProps) {
  const [selectedMeasurementKey, setSelectedMeasurementKey] = useState<string>("");
  const [selectedMeasurementLabel, setSelectedMeasurementLabel] = useState<string>("");
  const [newValue, setNewValue] = useState("");

  // Convert measurements object to array for rendering
  const entries = Object.entries(measurements).map(([key, value]) => ({ key, value }));

  // Get list of used measurement keys
  const usedMeasurements = Object.keys(measurements);

  const handleAddMeasurement = () => {
    if (!(selectedMeasurementKey && newValue.trim())) return;

    onChange({
      ...measurements,
      [selectedMeasurementKey]: newValue.trim(),
    });

    setSelectedMeasurementKey("");
    setSelectedMeasurementLabel("");
    setNewValue("");
  };

  const handleUpdateMeasurement = (key: string, value: string) => {
    onChange({
      ...measurements,
      [key]: value,
    });
  };

  const handleRemoveMeasurement = (key: string) => {
    const updated = { ...measurements };
    delete updated[key];
    onChange(updated);
  };

  const handleMeasurementSelect = (key: string, label: string) => {
    setSelectedMeasurementKey(key);
    setSelectedMeasurementLabel(label);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Existing Measurements */}
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map(({ key, value }) => (
            <div className="flex items-center gap-2" key={key}>
              <div className="grid flex-1 grid-cols-2 gap-2">
                <Input
                  className="h-9 cursor-not-allowed bg-muted/50"
                  disabled
                  value={key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                />
                <Input
                  className="h-9"
                  onChange={(e) => handleUpdateMeasurement(key, e.target.value)}
                  placeholder="e.g., 42 or 42/44"
                  value={value}
                />
              </div>
              <Button
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemoveMeasurement(key)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {entries.length === 0 && (
        <div className="border p-8 text-center">
          <p className="mb-2 text-muted-foreground text-sm">No measurements added yet</p>
          <p className="text-muted-foreground text-xs">
            Add measurements below or use quick add suggestions
          </p>
        </div>
      )}

      {/* Add New Measurement */}
      <div className="space-y-2">
        <p className="font-medium text-sm">Add Measurement</p>
        <div className="flex items-end gap-2">
          <div className="grid flex-1 grid-cols-2 gap-2">
            <MeasurementSelector
              onSelect={handleMeasurementSelect}
              placeholder="Select measurement"
              usedMeasurements={usedMeasurements}
              value={selectedMeasurementKey}
            />
            <Input
              className="h-10"
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddMeasurement();
                }
              }}
              placeholder="Value (e.g., 42)"
              value={newValue}
            />
          </div>
          <Button
            className="h-10"
            disabled={!(selectedMeasurementKey && newValue.trim())}
            onClick={handleAddMeasurement}
            size="sm"
            type="button"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Select a measurement from the dropdown and enter the value. Supports dual values (e.g.,
          "42/44")
        </p>
      </div>
    </div>
  );
}
