"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SlidersHorizontal } from "lucide-react";

type ColumnConfig = {
  id: string;
  label: string;
  visible: boolean;
};

type Props = {
  columns: ColumnConfig[];
  onToggle: (id: string) => void;
};

export function SimpleColumnVisibility({ columns, onToggle }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[200px] p-0" align="end" sideOffset={8}>
        <div className="flex flex-col p-4 space-y-2 max-h-[352px] overflow-auto">
          {columns.map((column) => (
            <div key={column.id} className="flex items-center space-x-2">
              <Checkbox
                id={column.id}
                checked={column.visible}
                onCheckedChange={() => onToggle(column.id)}
              />
              <label
                htmlFor={column.id}
                className="text-sm cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {column.label}
              </label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
