"use client";

import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSidebar } from "@/components/sidebar/sidebar-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV_SECTIONS, type NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = {
  expanded: "w-64",
  collapsed: "w-20",
} as const;

export function Sidebar() {
  const { isCollapsed, toggle } = useSidebar();
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "relative hidden border-r bg-sidebar text-sidebar-foreground transition-all duration-300 md:flex",
        isCollapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded,
      )}
    >
      <div className="flex h-full w-full flex-col">
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
              <span>C</span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-tight">Cimantikós</span>
                <span className="text-xs text-muted-foreground">Operations</span>
              </div>
            )}
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggle}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <TooltipProvider delayDuration={300}>
          <ScrollArea className="flex-1 px-2">
            <nav className="flex flex-col gap-6 pb-8">
              {NAV_SECTIONS.map((section) => (
                <div key={section.title} className="flex flex-col gap-2">
                  {!isCollapsed && (
                    <p className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {section.title}
                    </p>
                  )}
                  <div className="flex flex-col gap-1">
                    {section.items.map((item) => (
                      <SidebarLink
                        key={item.href}
                        item={item}
                        active={isLinkActive(item.href, pathname)}
                        collapsed={isCollapsed}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </ScrollArea>
        </TooltipProvider>

        <div className="border-t p-4">
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2",
              "bg-secondary text-secondary-foreground",
              isCollapsed && "flex-col gap-2 text-center",
            )}
          >
            <div className="h-8 w-8 rounded-full bg-primary/20" />
            {!isCollapsed && (
              <div className="flex-1 text-xs">
                <p className="font-medium">Logged in as</p>
                <p className="text-muted-foreground">Operations Manager</p>
              </div>
            )}
            <Button variant="outline" size="sm" className="h-7 px-3 text-xs">
              Switch
            </Button>
          </div>
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
  collapsed: boolean;
};

function SidebarLink({ item, active, collapsed }: SidebarLinkProps) {
  const Icon = item.icon as LucideIcon;

  const content = (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-md py-2 text-sm transition",
        collapsed ? "justify-center px-0" : "px-2",
        active ? "bg-primary/10 text-primary-foreground" : "hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="flex-1 text-sm font-medium leading-none">{item.title}</span>}
      {!collapsed && item.badge && (
        <Badge variant="secondary" className="ml-auto text-[11px]">
          {item.badge}
        </Badge>
      )}
    </Link>
  );

  if (!collapsed) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        <div className="flex items-center gap-2">
          <span>{item.title}</span>
          {item.badge && (
            <Badge variant="secondary" className="text-[11px]">
              {item.badge}
            </Badge>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
