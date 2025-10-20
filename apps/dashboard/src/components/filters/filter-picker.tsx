"use client";

import { useMemo, useState } from "react";
import type { FilterFieldDef } from "./types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    [fields, selectedKeys, q],
  );

  return (
    <div className="w-64 p-2">
      <Input
        placeholder="Filter by…"
        className="mb-2"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="max-h-64 overflow-auto">
        {available.map((f) => (
          <Button key={f.key} variant="ghost" className="w-full justify-start" onClick={() => onSelect(f.key)}>
            {f.label}
          </Button>
        ))}
        {available.length === 0 && (
          <div className="text-xs text-muted-foreground px-2 py-4">No more fields</div>
        )}
      </div>
    </div>
  );
}
