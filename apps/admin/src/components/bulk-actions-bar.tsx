"use client";

import { Button } from "@/components/ui/button";
import { Trash2, Copy, FileDown, X } from "lucide-react";

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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-background border border-border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>
        
        <div className="h-6 w-px bg-border" />
        
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={onCopy}
        >
          <Copy className="h-4 w-4" />
          Copy
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={onExport}
        >
          <FileDown className="h-4 w-4" />
          Export
        </Button>
        
        <div className="h-6 w-px bg-border" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
