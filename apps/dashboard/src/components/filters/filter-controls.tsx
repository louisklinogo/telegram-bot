"use client";

import { useEffect, useMemo, useState } from "react";
import type { FilterFieldDef } from "./types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComboboxMulti } from "@/components/ui/combobox-multi";

type CommonProps = {
  field: FilterFieldDef;
  value: any;
  onChange: (val: any) => void;
};

export function Control({ field, value, onChange }: CommonProps) {
  const [local, setLocal] = useState<any>(value);

  useEffect(() => setLocal(value), [value]);

  // Debounced commit (tighter for snappier pills UX)
  useEffect(() => {
    const id = setTimeout(() => onChange(local), 150);
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

  if (field.type === "select") {
    const opts = field.options ?? [];
    return (
      <Select
        value={local ?? ""}
        onValueChange={(val) => setLocal(val || undefined)}
      >
        <SelectTrigger className="h-8 w-[220px]">
          <SelectValue placeholder={`Select ${field.label.toLowerCase()}…`} />
        </SelectTrigger>
        <SelectContent>
          {opts.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === "multi") {
    const opts = field.options ?? [];
    const items = opts.map((o) => ({ id: o.value, label: o.label }));
    const vals: string[] = Array.isArray(local) ? local : [];
    return (
      <div className="w-[240px]">
        <ComboboxMulti
          items={items}
          values={vals}
          onChange={(ids) => setLocal(ids && ids.length ? ids : undefined)}
          placeholder={`Select ${field.label.toLowerCase()}…`}
          searchPlaceholder={`Search ${field.label.toLowerCase()}…`}
        />
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

  return <div className="text-xs text-muted-foreground">Unsupported control</div>;
}
