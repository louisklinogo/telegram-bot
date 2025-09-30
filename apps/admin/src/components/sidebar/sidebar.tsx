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
          "absolute top-0 left-0 h-[70px] flex items-center bg-background border-b border-border transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] z-50",
          isExpanded ? "w-full px-[22px]" : "w-[69px]",
        )}
      >
        <Link href="/" className={cn(
          "flex items-center gap-3 transition-none",
          !isExpanded && "justify-center w-full"
        )}>
          <svg
            width="26"
            height="26"
            viewBox="0 0 26 26"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0"
          >
            <circle cx="13" cy="13" r="13" fill="currentColor" />
            <text
              x="13"
              y="18"
              fontSize="14"
              fontWeight="600"
              fill="white"
              textAnchor="middle"
            >
              C
            </text>
          </svg>
          {isExpanded && (
            <span className="text-sm font-semibold whitespace-nowrap">Cimantikós</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <TooltipProvider delayDuration={0}>
        <ScrollArea className="flex-1 pt-[70px] pb-6">
          <nav className="w-full">
            <div className="flex flex-col gap-6">
              {NAV_SECTIONS.map((section) => (
                <div key={section.title} className="flex flex-col gap-2">
                  {isExpanded && (
                    <p className="px-[17px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      {section.title}
                    </p>
                  )}
                  <div className="flex flex-col gap-2">
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
            </div>
          </nav>
        </ScrollArea>
      </TooltipProvider>
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
    <Link prefetch href={item.href} className="group relative block">
      <div className="relative">
        {/* Background that expands */}
        <div
          className={cn(
            "border border-transparent h-[40px] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ml-[15px] mr-[15px]",
            active &&
              "bg-[#F2F1EF] dark:bg-secondary border-[#DCDAD2] dark:border-[#2C2C2C]",
            expanded ? "w-[calc(100%-30px)]" : "w-[40px]",
          )}
        />

        {/* Icon - Fixed position from left */}
        <div className="absolute top-0 left-[15px] w-[40px] h-[40px] flex items-center justify-center dark:text-[#666666] text-black group-hover:!text-primary pointer-events-none">
          <div className={cn(active && "dark:!text-white")}>
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {/* Label - appears when expanded */}
        {expanded && (
          <div className="absolute top-0 left-[55px] right-[4px] h-[40px] flex items-center pointer-events-none">
            <span
              className={cn(
                "text-sm font-medium transition-opacity duration-200 ease-in-out text-[#666] group-hover:text-primary",
                "whitespace-nowrap overflow-hidden",
                active && "text-primary",
              )}
            >
              {item.title}
            </span>
            {item.badge && (
              <Badge
                variant="secondary"
                className="ml-auto mr-2 text-[10px] h-5"
              >
                {item.badge}
              </Badge>
            )}
          </div>
        )}
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
