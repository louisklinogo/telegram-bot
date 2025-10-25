"use client";

import type React from "react";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Icons } from "./icons";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type Props = {
  range: DateRange;
  className: React.HTMLAttributes<HTMLDivElement>;
  onSelect: (range?: DateRange) => void;
  placeholder: string;
  disabled?: boolean;
};

export function DateRangePicker({ className, range, disabled, onSelect, placeholder }: Props) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild disabled={disabled}>
          <Button className={cn("justify-start space-x-2 text-left font-medium")} variant="outline">
            <span>{placeholder}</span>
            <Icons.ChevronDown />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="mt-2 w-auto p-0">
          <Calendar
            defaultMonth={range?.from}
            initialFocus
            mode="range"
            numberOfMonths={2}
            onSelect={onSelect}
            selected={range}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
