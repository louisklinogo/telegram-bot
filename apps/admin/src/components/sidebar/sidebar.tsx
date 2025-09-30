"use client";

import { type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV_SECTIONS, type NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-50 hidden h-screen flex-col border-r bg-background transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] md:flex",
        isExpanded ? "w-[240px]" : "w-[70px]",
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo/Brand Header */}
      <div
        className={cn(
          "flex h-[70px] items-center border-b bg-background transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isExpanded ? "w-full px-4" : "w-[69px] justify-center",
        )}
      >
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
            <span>C</span>
          </div>
          {isExpanded && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold leading-tight whitespace-nowrap">Cimantikós</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">Operations</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <TooltipProvider delayDuration={0}>
        <ScrollArea className="flex-1 py-6">
          <nav className="flex flex-col gap-6 px-3">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title} className="flex flex-col gap-2">
                {isExpanded && (
                  <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </p>
                )}
                <div className="flex flex-col gap-1">
                  {section.items.map((item) => (
                    <SidebarLink
                      key={item.href}
                      item={item}
                      active={isLinkActive(item.href, pathname)}
                      expanded={isExpanded}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </TooltipProvider>

      {/* User Section */}
      <div className="border-t p-4">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border bg-secondary px-3 py-2 transition-all",
            !isExpanded && "justify-center",
          )}
        >
          <div className="h-8 w-8 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold">
            OM
          </div>
          {isExpanded && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">Operations</p>
              <p className="text-[10px] text-muted-foreground truncate">Manager</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function isLinkActive(href: string, pathname: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(href);
}

type SidebarLinkProps = {
  item: NavItem;
  active: boolean;
  expanded: boolean;
};

function SidebarLink({ item, active, expanded }: SidebarLinkProps) {
  const Icon = item.icon as LucideIcon;

  const linkContent = (
    <Link
      href={item.href}
      className="group relative block"
    >
      <div className="relative">
        {/* Background that expands on hover/active */}
        <div
          className={cn(
            "absolute inset-0 rounded-md border transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
            active
              ? "bg-accent/50 border-border"
              : "bg-transparent border-transparent group-hover:bg-accent/30",
            expanded ? "left-0 right-0" : "left-0 right-0",
          )}
        />

        {/* Content */}
        <div className="relative flex items-center h-10 px-3 gap-3">
          <Icon
            className={cn(
              "h-5 w-5 shrink-0 transition-colors",
              active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
            )}
          />
          {expanded && (
            <span
              className={cn(
                "text-sm font-medium whitespace-nowrap transition-colors",
                active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
              )}
            >
              {item.title}
            </span>
          )}
          {expanded && item.badge && (
            <Badge variant="secondary" className="ml-auto text-[10px] h-5">
              {item.badge}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );

  if (expanded) {
    return linkContent;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        <div className="flex items-center gap-2">
          <span>{item.title}</span>
          {item.badge && (
            <Badge variant="secondary" className="text-[10px]">
              {item.badge}
            </Badge>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
