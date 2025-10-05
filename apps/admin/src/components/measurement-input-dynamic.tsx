"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MeasurementSelector } from "@/components/measurement-selector";

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
    if (!selectedMeasurementKey || !newValue.trim()) return;

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
            <div key={key} className="flex items-center gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  value={key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  disabled
                  className="h-9 bg-muted/50 cursor-not-allowed"
                />
                <Input
                  value={value}
                  onChange={(e) => handleUpdateMeasurement(key, e.target.value)}
                  placeholder="e.g., 42 or 42/44"
                  className="h-9"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemoveMeasurement(key)}
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
          <p className="text-sm text-muted-foreground mb-2">No measurements added yet</p>
          <p className="text-xs text-muted-foreground">
            Add measurements below or use quick add suggestions
          </p>
        </div>
      )}

      {/* Add New Measurement */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Add Measurement</p>
        <div className="flex items-end gap-2">
          <div className="flex-1 grid grid-cols-2 gap-2">
            <MeasurementSelector
              value={selectedMeasurementKey}
              onSelect={handleMeasurementSelect}
              usedMeasurements={usedMeasurements}
              placeholder="Select measurement"
            />
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Value (e.g., 42)"
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddMeasurement();
                }
              }}
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleAddMeasurement}
            disabled={!selectedMeasurementKey || !newValue.trim()}
            className="h-10"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Select a measurement from the dropdown and enter the value. Supports dual values (e.g., "42/44")
        </p>
      </div>
    </div>
  );
}
