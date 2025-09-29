import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  FileText,
  FolderOpenDot,
  GaugeCircle,
  LayoutDashboard,
  NotebookPen,
  ReceiptText,
  Ruler,
  Settings,
  Users,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  description?: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        title: "Performance",
        href: "/analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        title: "Clients",
        href: "/clients",
        icon: Users,
        badge: "24",
      },
      {
        title: "Orders",
        href: "/orders",
        icon: NotebookPen,
      },
      {
        title: "Invoices",
        href: "/invoices",
        icon: ReceiptText,
      },
      {
        title: "Measurements",
        href: "/measurements",
        icon: Ruler,
      },
      {
        title: "Files",
        href: "/files",
        icon: FolderOpenDot,
      },
    ],
  },
  {
    title: "Systems",
    items: [
      {
        title: "Health",
        href: "/health",
        icon: GaugeCircle,
      },
      {
        title: "Reports",
        href: "/reports",
        icon: FileText,
      },
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];
