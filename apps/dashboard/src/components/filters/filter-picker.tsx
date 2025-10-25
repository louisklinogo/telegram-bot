"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FilterFieldDef } from "./types";

type Props = {
  fields: FilterFieldDef[];
  selectedKeys: string[];
  onSelect: (key: string) => void;
};

export function FilterPicker({ fields, selectedKeys, onSelect }: Props) {
  const [q, setQ] = useState("");
  const available = useMemo(
    () =>
      fields
        .filter((f) => !selectedKeys.includes(f.key))
        .filter((f) => f.label.toLowerCase().includes(q.toLowerCase())),
    [fields, selectedKeys, q]
  );

  return (
    <div className="w-64 p-2">
      <Input
        className="mb-2"
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter by…"
        value={q}
      />
      <div className="max-h-64 overflow-auto">
        {available.map((f) => (
          <Button
            className="w-full justify-start"
            key={f.key}
            onClick={() => onSelect(f.key)}
            variant="ghost"
          >
            {f.label}
          </Button>
        ))}
        {available.length === 0 && (
          <div className="px-2 py-4 text-muted-foreground text-xs">No more fields</div>
        )}
      </div>
    </div>
  );
}
