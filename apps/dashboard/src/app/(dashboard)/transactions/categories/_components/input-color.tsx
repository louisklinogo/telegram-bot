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
        aria-label="Pick color"
        className="-translate-y-1/2 absolute top-1/2 left-3 h-3 w-3 rounded-sm border"
        onClick={() => colorRef.current?.click()}
        role="button"
        style={{ backgroundColor: color }}
      />
      <input
        aria-hidden
        className="sr-only"
        onChange={(e) => onChange({ name, color: e.target.value })}
        ref={colorRef}
        tabIndex={-1}
        type="color"
        value={color}
      />
      <Input
        className="pl-8"
        onChange={(e) => onChange({ name: e.target.value, color })}
        placeholder={placeholder}
        value={name}
      />
    </div>
  );
}
