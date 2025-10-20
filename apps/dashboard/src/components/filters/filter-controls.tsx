"use client";

import { useEffect, useMemo, useState } from "react";
import type { FilterFieldDef } from "./types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

type CommonProps = {
  field: FilterFieldDef;
  value: any;
  onChange: (val: any) => void;
};

export function Control({ field, value, onChange }: CommonProps) {
  const [local, setLocal] = useState<any>(value);

  useEffect(() => setLocal(value), [value]);

  // Debounced commit
  useEffect(() => {
    const id = setTimeout(() => onChange(local), 250);
    return () => clearTimeout(id);
  }, [local]);

  if (field.type === "text") {
    return (
      <Input
        autoFocus
        placeholder={`Type ${field.label.toLowerCase()}…`}
        value={String(local ?? "")}
        onChange={(e) => setLocal(e.target.value)}
      />
    );
  }

  if (field.type === "boolean") {
    return (
      <div className="flex gap-2">
        <Button
          variant={local === true ? "default" : "outline"}
          size="sm"
          onClick={() => setLocal(true)}
        >
          Yes
        </Button>
        <Button
          variant={local === false ? "default" : "outline"}
          size="sm"
          onClick={() => setLocal(false)}
        >
          No
        </Button>
      </div>
    );
  }

  if (field.type === "number_range") {
    const minKey = field.map?.min ?? "min";
    const maxKey = field.map?.max ?? "max";
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          placeholder="Min"
          className="w-24"
          value={local?.[minKey] ?? ""}
          onChange={(e) => setLocal({ ...(local ?? {}), [minKey]: e.target.value ? Number(e.target.value) : undefined })}
        />
        <span className="text-muted-foreground text-xs">to</span>
        <Input
          type="number"
          placeholder="Max"
          className="w-24"
          value={local?.[maxKey] ?? ""}
          onChange={(e) => setLocal({ ...(local ?? {}), [maxKey]: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>
    );
  }

  if (field.type === "date_range") {
    const fromKey = field.map?.start ?? "from";
    const toKey = field.map?.end ?? "to";
    const selected = useMemo(() => ({
      from: local?.[fromKey] ? new Date(local[fromKey]) : undefined,
      to: local?.[toKey] ? new Date(local[toKey]) : undefined,
    }), [local]);
    return (
      <Calendar
        mode="range"
        initialFocus
        selected={selected}
        onSelect={(range: any) => {
          setLocal({
            ...(local ?? {}),
            [fromKey]: range?.from ? range.from.toISOString().slice(0, 10) : undefined,
            [toKey]: range?.to ? range.to.toISOString().slice(0, 10) : undefined,
          });
        }}
      />
    );
  }

  // multi/select controls can be added later (we’ll reuse existing ComboboxDropdown if needed)
  return <div className="text-xs text-muted-foreground">Unsupported control</div>;
}
