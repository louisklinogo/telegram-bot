"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { Scissors } from "lucide-react";
import * as React from "react";

// All available measurements from schema
const MEASUREMENTS = [
  { key: "chest", label: "Chest", description: "Around fullest part" },
  { key: "stomach", label: "Stomach", description: "Around stomach" },
  { key: "waist", label: "Waist", description: "Around natural waist" },
  { key: "hips", label: "Hips", description: "Around fullest part" },
  { key: "lap", label: "Lap", description: "Around lap/seat" },
  { key: "neck", label: "Neck", description: "Around base of neck" },
  { key: "shoulder", label: "Shoulder", description: "Across shoulders" },
  { key: "top_length", label: "Top Length", description: "Shoulder to hem" },
  { key: "pant_length", label: "Pant Length", description: "Waist to ankle" },
  { key: "sleeve_length", label: "Sleeve Length", description: "Shoulder to wrist" },
  { key: "bicep_round", label: "Bicep Round", description: "Around bicep" },
  { key: "wrist_round", label: "Wrist Round", description: "Around wrist" },
  { key: "ankle_round", label: "Ankle Round", description: "Around ankle" },
  { key: "calf", label: "Calf", description: "Around calf" },
  { key: "thigh", label: "Thigh", description: "Around thigh" },
  { key: "knee", label: "Knee", description: "Around knee" },
  { key: "back_length", label: "Back Length", description: "Neck to waist" },
  { key: "jacket_length", label: "Jacket Length", description: "Collar to hem" },
  { key: "arm_hole", label: "Arm Hole", description: "Around armpit" },
  { key: "burst", label: "Burst", description: "Across bust" },
  { key: "under_burst", label: "Under Burst", description: "Under bust" },
  { key: "shoulder_to_nipple", label: "Shoulder to Nipple", description: "Vertical measurement" },
  { key: "shoulder_to_under_burst", label: "Shoulder to Under Burst", description: "Vertical measurement" },
  { key: "nipple_to_nipple", label: "Nipple to Nipple", description: "Horizontal measurement" },
  { key: "crotch", label: "Crotch", description: "Rise measurement" },
  { key: "rise", label: "Rise", description: "Front rise" },
  { key: "inseam", label: "Inseam", description: "Inside leg seam" },
  { key: "outseam", label: "Outseam", description: "Outside leg seam" },
];

type Props = {
  value?: string;
  onSelect: (key: string, label: string) => void;
  usedMeasurements?: string[];
  placeholder?: string;
};

export function MeasurementSelector({ 
  value, 
  onSelect, 
  usedMeasurements = [],
  placeholder = "Select measurement" 
}: Props) {
  const [open, setOpen] = React.useState(false);

  const selected = MEASUREMENTS.find((m) => m.key === value);
  
  // Filter out already used measurements
  const availableMeasurements = MEASUREMENTS.filter(
    (m) => !usedMeasurements.includes(m.key)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal truncate"
        >
          <span className="truncate flex items-center gap-2">
            {value && selected ? (
              <>
                <Scissors className="h-3.5 w-3.5 text-muted-foreground" />
                {selected.label}
              </>
            ) : (
              placeholder
            )}
          </span>
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command loop>
          <CommandInput
            placeholder="Search measurement..."
            className="h-9 px-2"
            autoComplete="off"
          />
          <CommandEmpty>No measurement found.</CommandEmpty>
          <CommandGroup>
            <CommandList className="overflow-y-auto max-h-[300px] pt-2">
              {availableMeasurements.map((measurement) => (
                <CommandItem
                  key={measurement.key}
                  value={`${measurement.label} ${measurement.description}`}
                  onSelect={() => {
                    onSelect(measurement.key, measurement.label);
                    setOpen(false);
                  }}
                  className="flex flex-col items-start py-2"
                >
                  <div className="flex items-center w-full">
                    <Scissors className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{measurement.label}</span>
                    <CheckIcon
                      className={cn(
                        "ml-auto h-4 w-4",
                        value === measurement.key ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground ml-6">
                    {measurement.description}
                  </span>
                </CommandItem>
              ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
