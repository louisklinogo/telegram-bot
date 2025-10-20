"use client";

import { useMemo, useState } from "react";
import type { FilterFieldDef } from "./types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FilterPicker } from "./filter-picker";
import { FilterPills } from "./filter-pills";
import { Icons } from "@/components/ui/icons";

type Props = {
  fields: FilterFieldDef[];
  values: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
};

export function FilterToolbar({ fields, values, onChange }: Props) {
  const selectedKeys = useMemo(() => Object.keys(values).filter((k) => values[k] != null), [values]);
  const [open, setOpen] = useState(false);

  const pills = useMemo(
    () =>
      selectedKeys
        .map((key) => fields.find((f) => f.key === key)!)
        .filter(Boolean)
        .map((field) => ({
          field,
          value: values[field.key],
          onChange: (val: any) => onChange({ ...values, [field.key]: val }),
          onRemove: () => {
            const next = { ...values } as any;
            delete next[field.key];
            onChange(next);
          },
        })),
    [fields, selectedKeys, values, onChange],
  );

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-end gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Add filter">
              <Icons.Filter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="p-0">
            <FilterPicker
              fields={fields}
              selectedKeys={selectedKeys}
              onSelect={(key) => {
                setOpen(false);
                onChange({ ...values, [key]: values[key] ?? (fields.find((f) => f.key === key)?.type === "boolean" ? false : "") });
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      {pills.length > 0 && <FilterPills pills={pills} />}
    </div>
  );
}
