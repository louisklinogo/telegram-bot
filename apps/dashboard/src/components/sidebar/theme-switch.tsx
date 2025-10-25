"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-md border p-1">
      <button
        className={cn(
          "rounded p-1 transition-colors",
          theme === "light"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => setTheme("light")}
        type="button"
      >
        <Sun className="h-3.5 w-3.5" />
      </button>
      <button
        className={cn(
          "rounded p-1 transition-colors",
          theme === "dark"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => setTheme("dark")}
        type="button"
      >
        <Moon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
