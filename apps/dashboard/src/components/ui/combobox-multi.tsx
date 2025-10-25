"use client";

import { CommandList } from "cmdk";
import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type Item = { id: string; label: string };

type Props = {
  items: Item[];
  values: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  onCreate?: (name: string) => void;
};

export function ComboboxMulti({
  items,
  values,
  onChange,
  placeholder,
  searchPlaceholder,
  onCreate,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const filtered = items.filter((i) => i.label.toLowerCase().includes(inputValue.toLowerCase()));
  const showCreate = onCreate && Boolean(inputValue) && !filtered.length;

  const toggle = (id: string) => {
    if (values.includes(id)) onChange(values.filter((v) => v !== id));
    else onChange([...values, id]);
  };

  return (
    <Popover modal onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild className="w-full">
        <Button className="w-full justify-between font-normal" variant="outline">
          <span className="truncate pr-3">
            {values.length
              ? `${values.length} tag${values.length > 1 ? "s" : ""} selected`
              : (placeholder ?? "Select tags...")}
          </span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" style={{ width: "var(--radix-popover-trigger-width)" }}>
        <Command loop shouldFilter={false}>
          <CommandInput
            className="px-3"
            onValueChange={setInputValue}
            placeholder={searchPlaceholder ?? "Search..."}
            value={inputValue}
          />
          <CommandGroup>
            <CommandList className="max-h-[225px] overflow-auto">
              {filtered.map((item) => (
                <CommandItem
                  className="cursor-pointer"
                  key={item.id}
                  onSelect={(id) => toggle(id)}
                  value={item.id}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      values.includes(item.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item.label}
                </CommandItem>
              ))}
              <CommandEmpty>No tags</CommandEmpty>
              {showCreate && (
                <CommandItem
                  key={inputValue}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onSelect={() => {
                    onCreate?.(inputValue);
                    setOpen(false);
                    setInputValue("");
                  }}
                  value={inputValue}
                >
                  Create "{inputValue}"
                </CommandItem>
              )}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
