"use client";

import countries from "@/lib/country-flags";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import * as React from "react";
import { useEffect } from "react";

type Props = {
  defaultValue: string;
  onSelect: (countryCode: string, countryName: string) => void;
};

export function CountrySelector({ defaultValue, onSelect }: Props) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(defaultValue);

  useEffect(() => {
    if (value !== defaultValue) {
      setValue(defaultValue);
    }
  }, [defaultValue, value]);

  const selected = Object.values(countries).find((country) => country.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal truncate"
        >
          <span className="truncate">
            {value && selected ? `${selected.emoji} ${selected.name}` : "Select country"}
          </span>
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[225px] p-0" align="start">
        <Command loop>
          <CommandInput
            placeholder="Search country..."
            className="h-9 px-2"
            autoComplete="off"
          />
          <CommandEmpty>No country found.</CommandEmpty>
          <CommandGroup>
            <CommandList className="overflow-y-auto max-h-[230px] pt-2">
              {Object.values(countries).map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.name}
                  onSelect={() => {
                    setValue(country.code);
                    onSelect?.(country.code, country.name);
                    setOpen(false);
                  }}
                >
                  <span className="mr-2">{country.emoji}</span>
                  {country.name}
                  <CheckIcon
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === country.code ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
