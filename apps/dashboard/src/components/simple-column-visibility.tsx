"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
        <Button size="icon" variant="outline">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[200px] p-0" sideOffset={8}>
        <div className="flex max-h-[352px] flex-col space-y-2 overflow-auto p-4">
          {columns.map((column) => (
            <div className="flex items-center space-x-2" key={column.id}>
              <Checkbox
                checked={column.visible}
                id={column.id}
                onCheckedChange={() => onToggle(column.id)}
              />
              <label
                className="cursor-pointer text-sm peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor={column.id}
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
