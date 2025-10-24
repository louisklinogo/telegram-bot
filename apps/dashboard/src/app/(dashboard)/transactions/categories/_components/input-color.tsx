"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";

type Props = {
  name: string;
  color: string;
  placeholder?: string;
  onChange: (v: { name: string; color: string }) => void;
};

export function InputColor({ name, color, placeholder, onChange }: Props) {
  const colorRef = useRef<HTMLInputElement>(null);
  return (
    <div className="relative">
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 rounded-sm border"
        style={{ backgroundColor: color }}
        role="button"
        aria-label="Pick color"
        onClick={() => colorRef.current?.click()}
      />
      <input
        ref={colorRef}
        type="color"
        value={color}
        onChange={(e) => onChange({ name, color: e.target.value })}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />
      <Input
        value={name}
        onChange={(e) => onChange({ name: e.target.value, color })}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  );
}
