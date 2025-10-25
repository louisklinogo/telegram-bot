"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FilterDropdown } from "./filter-dropdown";
import { FilterPicker } from "./filter-picker";
import { FilterPills } from "./filter-pills";
import type { FilterFieldDef } from "./types";

type Props = {
  fields: FilterFieldDef[];
  values: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
  appearance?: "icon" | "chip";
};

export function FilterToolbar({ fields, values, onChange, appearance = "icon" }: Props) {
  const selectedKeys = useMemo(() => {
    return Object.keys(values).filter((k) => {
      const v = (values as any)[k];
      if (v == null) return false;
      if (typeof v === "boolean") return v === true; // only show pill for true booleans
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === "object") {
        const entries = Object.values(v ?? {});
        return entries.some((val) => val != null && val !== "");
      }
      return true;
    });
  }, [values]);
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
    [fields, selectedKeys, values, onChange]
  );

  return (
    <div className="flex flex-col gap-1">
      {pills.length > 0 ? (
        <FilterPills
          pills={pills}
          trailing={
            appearance === "chip" ? (
              <FilterDropdown
                hide={{
                  date: Boolean(
                    (values as any).dateRange?.startDate || (values as any).dateRange?.endDate
                  ),
                  amount: Boolean(
                    (values as any).amountRange?.amountMin != null ||
                      (values as any).amountRange?.amountMax != null
                  ),
                  statuses: Boolean((values as any).statuses?.length),
                  categories: Boolean((values as any).categories?.length),
                  tags: Boolean((values as any).tags?.length),
                  accounts: Boolean((values as any).accounts?.length),
                  assignees: Boolean((values as any).assignees?.length),
                  attachments: Boolean((values as any).hasAttachments != null),
                }}
                mode="chip"
                onChange={(next) => {
                  const merged: any = { ...(values as any) };
                  if (next.startDate !== undefined || next.endDate !== undefined) {
                    merged.dateRange = {
                      ...(merged.dateRange || {}),
                      startDate: next.startDate,
                      endDate: next.endDate,
                    };
                  }
                  if (next.amountMin !== undefined || next.amountMax !== undefined) {
                    const min = next.amountMin ?? merged.amountRange?.amountMin ?? undefined;
                    const max = next.amountMax ?? merged.amountRange?.amountMax ?? undefined;
                    merged.amountRange = { amountMin: min, amountMax: max } as any;
                  }
                  if (next.attachments !== undefined) {
                    merged.hasAttachments =
                      next.attachments === "include"
                        ? true
                        : next.attachments === "exclude"
                          ? false
                          : undefined;
                  }
                  if (next.statuses !== undefined) merged.statuses = next.statuses;
                  if (next.categories !== undefined) merged.categories = next.categories;
                  if (next.tags !== undefined) merged.tags = next.tags;
                  if (next.accounts !== undefined) merged.accounts = next.accounts;
                  if (next.assignees !== undefined) merged.assignees = next.assignees;
                  onChange(merged);
                }}
                values={{
                  statuses: (values as any).statuses,
                  categories: (values as any).categories,
                  tags: (values as any).tags,
                  accounts: (values as any).accounts,
                  assignees: (values as any).assignees,
                  startDate: (values as any).dateRange?.startDate,
                  endDate: (values as any).dateRange?.endDate,
                  amountMin: (values as any).amountRange?.amountMin,
                  amountMax: (values as any).amountRange?.amountMax,
                  attachments:
                    (values as any).hasAttachments === undefined
                      ? undefined
                      : (values as any).hasAttachments
                        ? "include"
                        : "exclude",
                }}
              />
            ) : null
          }
        />
      ) : appearance === "icon" ? (
        <div className="flex items-center justify-end">
          <FilterDropdown
            mode="icon"
            onChange={(next) => {
              const safe = { ...(values as any), ...(next as any) };
              onChange(safe);
            }}
            values={{}}
          />
        </div>
      ) : null}
    </div>
  );
}
