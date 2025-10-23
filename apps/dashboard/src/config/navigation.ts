import type { LucideIcon } from "lucide-react";
import {
  CreditCard,
  Inbox,
  LayoutDashboard,
  NotebookPen,
  ReceiptText,
  Ruler,
  Settings,
  Users,
  Vault,
  Package,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  description?: string;
  children?: { title: string; href: string }[];
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
        description: "Business overview",
      },
      {
        title: "Inbox",
        href: "/inbox",
        icon: Inbox,
        description: "Messages & notifications",
      },
    ],
  },
  {
    title: "Business",
    items: [
      {
        title: "Transactions",
        href: "/transactions",
        icon: CreditCard,
        description: "Payments & expenses",
        children: [
          { title: "Categories", href: "/transactions/categories" },
        ],
      },
      {
        title: "Orders",
        href: "/orders",
        icon: NotebookPen,
        description: "Tailoring orders",
      },
      {
        title: "Invoices",
        href: "/invoices",
        icon: ReceiptText,
        description: "Billing & payments",
      },
      {
        title: "Products",
        href: "/products",
        icon: Package,
        description: "Catalog & inventory",
      },
      {
        title: "Clients",
        href: "/clients",
        icon: Users,
        description: "Customer database",
      },
    ],
  },
  {
    title: "Tailoring",
    items: [
      {
        title: "Measurements",
        href: "/measurements",
        icon: Ruler,
        description: "Client measurements",
      },
      {
        title: "Vault",
        href: "/vault",
        icon: Vault,
        description: "Documents & files",
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        description: "App configuration",
        children: [{ title: "Accounts", href: "/settings/accounts" }],
      },
    ],
  },
];
