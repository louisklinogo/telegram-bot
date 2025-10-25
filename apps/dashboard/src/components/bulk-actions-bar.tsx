"use client";

import { Copy, FileDown, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BulkActionsBarProps = {
  selectedCount: number;
  onDelete: () => void;
  onCopy: () => void;
  onExport: () => void;
  onClear: () => void;
};

export function BulkActionsBar({
  selectedCount,
  onDelete,
  onCopy,
  onExport,
  onClear,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="-translate-x-1/2 fixed bottom-4 left-1/2 z-50">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 shadow-lg">
        <span className="font-medium text-sm">{selectedCount} selected</span>

        <div className="h-6 w-px bg-border" />

        <Button className="gap-2" onClick={onDelete} size="sm" variant="ghost">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>

        <Button className="gap-2" onClick={onCopy} size="sm" variant="ghost">
          <Copy className="h-4 w-4" />
          Copy
        </Button>

        <Button className="gap-2" onClick={onExport} size="sm" variant="ghost">
          <FileDown className="h-4 w-4" />
          Export
        </Button>

        <div className="h-6 w-px bg-border" />

        <Button onClick={onClear} size="sm" variant="ghost">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
