"use client";

import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import * as React from "react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import countryCodes from "@/constants/country-codes.json" with { type: "json" };
import { cn } from "@/lib/utils";

type Country = {
  name: string;
  dial_code: string;
  code: string;
};

type Props = {
  defaultValue?: string;
  onSelect: (dialCode: string, countryName: string) => void;
};

export function PhoneCountrySelector({ defaultValue = "", onSelect }: Props) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(defaultValue);

  const countries: Country[] = countryCodes as Country[];

  useEffect(() => {
    if (value !== defaultValue) {
      setValue(defaultValue);
    }
  }, [defaultValue, value]);

  const selected = countries.find(
    (country) => country.dial_code === value || country.code === value
  );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="w-20 justify-between px-2 font-normal"
          type="button"
          variant="outline"
        >
          {value ? selected?.dial_code : "+1"}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[60] w-[280px] p-0" portal={true}>
        <Command loop>
          <CommandInput
            autoComplete="off"
            className="h-9 px-2"
            placeholder="Search country or code..."
          />
          <CommandEmpty>No country found.</CommandEmpty>
          <CommandGroup>
            <CommandList className="max-h-[280px] overflow-y-auto pt-2">
              {countries.map((country) => (
                <CommandItem
                  key={country.code}
                  onSelect={() => {
                    setValue(country.dial_code);
                    onSelect?.(country.dial_code, country.name);
                    setOpen(false);
                  }}
                  value={`${country.name} ${country.dial_code}`}
                >
                  <span className="flex-1">
                    {country.name}
                    <span className="ml-2 text-muted-foreground text-sm">{country.dial_code}</span>
                  </span>
                  <CheckIcon
                    className={cn(
                      "h-4 w-4",
                      value === country.dial_code ? "opacity-100" : "opacity-0"
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
