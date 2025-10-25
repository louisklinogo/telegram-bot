"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  MdCreditCard,
  MdExpandMore,
  MdGridView,
  MdInbox,
  MdInventory2,
  MdListAlt,
  MdOutlineMonitor,
  MdPeople,
  MdReceiptLong,
  MdSettings,
  MdStraighten,
} from "react-icons/md";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV_SECTIONS, type NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { TeamDropdown } from "./team-dropdown";

type SidebarProps = {
  teams?: { team: { id: string; name: string | null } }[];
  currentTeamId?: string;
};

export function Sidebar({ teams = [], currentTeamId }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedItemHref, setExpandedItemHref] = useState<string | null>(null);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-50 hidden h-screen flex-col border-r bg-background transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] md:flex",
        isExpanded ? "w-[240px]" : "w-[70px]"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo/Brand Header */}
      <div
        className={cn(
          "absolute top-0 left-0 z-50 flex h-[70px] items-center border-border border-b bg-background transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isExpanded ? "w-full px-[22px]" : "w-[69px]"
        )}
      >
        <Link
          className={cn(
            "flex items-center gap-3 transition-none",
            !isExpanded && "w-full justify-center"
          )}
          href="/"
        >
          <svg
            className="shrink-0"
            fill="none"
            height="26"
            viewBox="0 0 26 26"
            width="26"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="13" cy="13" fill="currentColor" r="13" />
            <text fill="white" fontSize="14" fontWeight="600" textAnchor="middle" x="13" y="18">
              C
            </text>
          </svg>
          {isExpanded && (
            <span className="whitespace-nowrap font-semibold text-sm">Cimantikós</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <TooltipProvider delayDuration={0}>
        <ScrollArea className="flex-1 pt-[70px] pb-6">
          <nav className="mt-3 w-full">
            <div className="flex flex-col gap-6">
              {NAV_SECTIONS.map((section) => (
                <div className="flex flex-col gap-2" key={section.title}>
                  {isExpanded && (
                    <p className="mb-1 px-[17px] font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                      {section.title}
                    </p>
                  )}
                  <div className="flex flex-col gap-2">
                    {section.items.map((item) => (
                      <SidebarLink
                        active={isLinkActive(item.href, pathname)}
                        expanded={isExpanded}
                        expandedItemHref={expandedItemHref}
                        item={item}
                        key={item.href}
                        onToggle={(href) =>
                          setExpandedItemHref((prev) => (prev === href ? null : href))
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        </ScrollArea>
      </TooltipProvider>

      {/* Team switcher (bottom-left) */}
      <TeamDropdown currentTeamId={currentTeamId} isExpanded={isExpanded} teams={teams} />
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
  expandedItemHref?: string | null;
  onToggle?: (href: string) => void;
};

function SidebarLink({ item, active, expanded, expandedItemHref, onToggle }: SidebarLinkProps) {
  const Icon = getSidebarIcon(item);
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const isItemExpanded = expanded && expandedItemHref === item.href;

  const linkContent = (
    <Link className="group relative block" href={item.href} prefetch={false}>
      <div className="relative">
        {/* Background that expands */}
        <div
          className={cn(
            "mr-[15px] ml-[15px] h-[40px] border border-transparent transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
            active && "border-border bg-accent",
            expanded ? "w-[calc(100%-30px)]" : "w-[40px]"
          )}
        />

        {/* Icon - Fixed position from left */}
        <div className="group-hover:!text-primary pointer-events-none absolute top-0 left-[15px] flex h-[40px] w-[40px] items-center justify-center text-muted-foreground transition-colors">
          <div className={cn(active && "text-primary")}>
            {/* Material Sharp icons via react-icons; size fixed to 20px */}
            <Icon className="shrink-0" size={20} />
          </div>
        </div>

        {/* Label - appears when expanded */}
        {expanded && (
          <div className="pointer-events-none absolute top-0 right-[15px] left-[55px] flex h-[40px] items-center">
            <span
              className={cn(
                "font-medium text-muted-foreground text-sm transition-opacity duration-200 ease-in-out group-hover:text-primary",
                "overflow-hidden whitespace-nowrap",
                active && "text-primary"
              )}
            >
              {item.title}
            </span>
            <div className="pointer-events-auto ml-auto flex items-center gap-1">
              {item.badge && (
                <Badge className="h-5 text-[10px]" variant="secondary">
                  {item.badge}
                </Badge>
              )}
              {hasChildren && (
                <button
                  className={cn(
                    "flex h-6 w-6 items-center justify-center text-muted-foreground transition-transform hover:text-primary",
                    isItemExpanded && "rotate-180"
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggle?.(item.href);
                  }}
                  type="button"
                >
                  <MdExpandMore size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Link>
  );

  if (expanded) {
    return (
      <div className="flex flex-col">
        {linkContent}
        {hasChildren && isItemExpanded && (
          <div className="mt-1 mr-[15px] ml-[35px] border-border border-l">
            <div className="flex flex-col gap-1 py-1 pl-3">
              {(item.children ?? []).map((child) => (
                <Link
                  className={cn(
                    "overflow-hidden whitespace-nowrap text-muted-foreground text-xs transition-colors hover:text-primary"
                  )}
                  href={child.href}
                  key={child.href}
                  prefetch={false}
                >
                  {child.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
      <TooltipContent className="text-xs" side="right">
        <div className="flex items-center gap-2">
          <span>{item.title}</span>
          {item.badge && (
            <Badge className="text-[10px]" variant="secondary">
              {item.badge}
            </Badge>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function getSidebarIcon(item: NavItem) {
  // Map known top-level routes to Material Sharp icons; default to Grid
  const href = item.href;
  if (href === "/") return MdOutlineMonitor; // closest to "Monitoring"
  if (href.startsWith("/inbox")) return MdInbox;
  if (href.startsWith("/transactions")) return MdCreditCard;
  if (href.startsWith("/orders")) return MdListAlt;
  if (href.startsWith("/invoices")) return MdReceiptLong;
  if (href.startsWith("/clients")) return MdPeople;
  if (href.startsWith("/measurements")) return MdStraighten;
  if (href.startsWith("/vault")) return MdInventory2;
  if (href.startsWith("/settings")) return MdSettings;
  return MdGridView;
}
