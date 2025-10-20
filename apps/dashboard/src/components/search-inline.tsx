"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryState } from "nuqs";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";

type Props = {
  placeholder?: string;
  className?: string;
};

export function SearchInline({ placeholder = "Search…", className }: Props) {
  const [q, setQ] = useQueryState("q", { defaultValue: "" });
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(q || "");
      inputRef.current?.focus();
    }
  }, [open]);

  // Auto-commit with debounce
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => setQ(value || ""), 250);
    return () => clearTimeout(id);
  }, [value, open, setQ]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!open ? (
        <Button variant="ghost" size="icon" aria-label="Search" onClick={() => setOpen(true)}>
          <Icons.Search className="h-4 w-4" />
        </Button>
      ) : (
        <div className="flex items-center gap-2 transition-all">
          <div className="relative">
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
              onBlur={() => setQ(value || "")}
              placeholder={placeholder}
              className="w-[0px] sm:w-[300px] pl-9 transition-[width] duration-200"
            />
          </div>
          {value && (
            <Button variant="ghost" size="icon" aria-label="Clear" onClick={() => setValue("") }>
              <Icons.Close className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" aria-label="Close" onClick={() => setOpen(false)}>
            <Icons.Close className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
