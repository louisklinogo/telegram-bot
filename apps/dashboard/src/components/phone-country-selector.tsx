'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import * as React from 'react';
import { useEffect } from 'react';
import countryCodes from '@/constants/country-codes.json';

type Country = {
  name: string;
  dial_code: string;
  code: string;
};

type Props = {
  defaultValue?: string;
  onSelect: (dialCode: string, countryName: string) => void;
};

export function PhoneCountrySelector({ defaultValue = '', onSelect }: Props) {
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-expanded={open}
          className="w-20 justify-between font-normal px-2"
        >
          {value ? selected?.dial_code : '+1'}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 z-[60]" align="start" portal={true}>
        <Command loop>
          <CommandInput
            placeholder="Search country or code..."
            className="h-9 px-2"
            autoComplete="off"
          />
          <CommandEmpty>No country found.</CommandEmpty>
          <CommandGroup>
            <CommandList className="overflow-y-auto max-h-[280px] pt-2">
              {countries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.dial_code}`}
                  onSelect={() => {
                    setValue(country.dial_code);
                    onSelect?.(country.dial_code, country.name);
                    setOpen(false);
                  }}
                >
                  <span className="flex-1">
                    {country.name}
                    <span className="ml-2 text-sm text-muted-foreground">{country.dial_code}</span>
                  </span>
                  <CheckIcon
                    className={cn(
                      'h-4 w-4',
                      value === country.dial_code ? 'opacity-100' : 'opacity-0'
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
