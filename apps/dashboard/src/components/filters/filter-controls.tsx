"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ComboboxMulti } from "@/components/ui/combobox-multi";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FilterFieldDef } from "./types";

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
        onChange={(e) => setLocal(e.target.value)}
        placeholder={`Type ${field.label.toLowerCase()}…`}
        value={String(local ?? "")}
      />
    );
  }

  if (field.type === "boolean") {
    return (
      <div className="flex gap-2">
        <Button
          onClick={() => setLocal(true)}
          size="sm"
          variant={local === true ? "default" : "outline"}
        >
          Yes
        </Button>
        <Button
          onClick={() => setLocal(false)}
          size="sm"
          variant={local === false ? "default" : "outline"}
        >
          No
        </Button>
      </div>
    );
  }

  if (field.type === "select") {
    const opts = field.options ?? [];
    return (
      <Select onValueChange={(val) => setLocal(val || undefined)} value={local ?? ""}>
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
          onChange={(ids) => setLocal(ids && ids.length ? ids : undefined)}
          placeholder={`Select ${field.label.toLowerCase()}…`}
          searchPlaceholder={`Search ${field.label.toLowerCase()}…`}
          values={vals}
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
          className="w-24"
          onChange={(e) =>
            setLocal({
              ...(local ?? {}),
              [minKey]: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          placeholder="Min"
          type="number"
          value={local?.[minKey] ?? ""}
        />
        <span className="text-muted-foreground text-xs">to</span>
        <Input
          className="w-24"
          onChange={(e) =>
            setLocal({
              ...(local ?? {}),
              [maxKey]: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          placeholder="Max"
          type="number"
          value={local?.[maxKey] ?? ""}
        />
      </div>
    );
  }

  if (field.type === "date_range") {
    const fromKey = field.map?.start ?? "from";
    const toKey = field.map?.end ?? "to";
    const selected = useMemo(
      () => ({
        from: local?.[fromKey] ? new Date(local[fromKey]) : undefined,
        to: local?.[toKey] ? new Date(local[toKey]) : undefined,
      }),
      [local]
    );
    return (
      <Calendar
        initialFocus
        mode="range"
        onSelect={(range: any) => {
          setLocal({
            ...(local ?? {}),
            [fromKey]: range?.from ? range.from.toISOString().slice(0, 10) : undefined,
            [toKey]: range?.to ? range.to.toISOString().slice(0, 10) : undefined,
          });
        }}
        selected={selected}
      />
    );
  }

  return <div className="text-muted-foreground text-xs">Unsupported control</div>;
}
