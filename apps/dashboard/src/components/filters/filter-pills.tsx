"use client";

import { useMemo } from "react";
import type { FilterFieldDef } from "./types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Control } from "./filter-controls";

type Pill = {
  field: FilterFieldDef;
  value: any;
  onChange: (val: any) => void;
  onRemove: () => void;
};

export function FilterPills({ pills, trailing }: { pills: Pill[]; trailing?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      {pills.map((p) => (
        <Popover key={p.field.key}>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="gap-2">
              {p.field.label}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-3 space-y-2">
            <Control field={p.field} value={p.value} onChange={p.onChange} />
            <div className="flex justify-between pt-1">
              <Button variant="ghost" size="sm" onClick={p.onRemove}>
                Remove
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      ))}
      {trailing}
    </div>
  );
}
