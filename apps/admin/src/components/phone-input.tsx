"use client";

import PhoneInputWithCountry from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Input } from "@/components/ui/input";
import type { E164Number } from "libphonenumber-js/core";

type PhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  defaultCountry?: string;
};

export function PhoneInput({
  value,
  onChange,
  placeholder = "Enter phone number",
  defaultCountry = "GH", // Ghana default
}: PhoneInputProps) {
  return (
    <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <PhoneInputWithCountry
        international
        countryCallingCodeEditable={false}
        defaultCountry={defaultCountry as any}
        value={value as E164Number}
        onChange={(val) => onChange(val || "")}
        inputComponent={Input as any}
        placeholder={placeholder}
        className="border-0 p-0 focus:ring-0 bg-transparent"
      />
    </div>
  );
}
