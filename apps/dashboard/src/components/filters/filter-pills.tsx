"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Control } from "./filter-controls";
import type { FilterFieldDef } from "./types";

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
            <Button className="gap-2" size="sm" variant="secondary">
              {p.field.label}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto space-y-2 p-3">
            <Control field={p.field} onChange={p.onChange} value={p.value} />
            <div className="flex justify-between pt-1">
              <Button onClick={p.onRemove} size="sm" variant="ghost">
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
