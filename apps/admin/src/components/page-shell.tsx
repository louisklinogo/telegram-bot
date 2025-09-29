"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type PageShellProps = {
  title: string;
  description?: string;
  headerActions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export function PageShell({
  title,
  description,
  headerActions,
  className,
  children,
}: PageShellProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex flex-col gap-4 border-b bg-background px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold leading-tight">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {headerActions ? (
          <div className="flex flex-wrap items-center gap-2">{headerActions}</div>
        ) : null}
      </header>

      <ScrollArea className="flex-1">
        <div className={cn("px-6 py-6", className)}>{children}</div>
      </ScrollArea>
    </div>
  );
}
