"use client";

/**
 * Lazy-loaded components for better performance
 * These heavy components are loaded on-demand to reduce initial bundle size
 */

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Editor component (TipTap is heavy - ~100kb)
export const LazyEditor = dynamic(() => import("@/components/ui/editor").then((mod) => ({ default: mod.Editor })), {
  loading: () => <Skeleton className="h-[200px] w-full" />,
  ssr: false, // Editor needs browser APIs
});

// Chart components (Recharts is heavy - ~50kb)
export const LazyAreaChart = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.AreaChart })),
  {
    loading: () => <Skeleton className="h-[300px] w-full" />,
    ssr: false,
  }
);

export const LazyLineChart = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.LineChart })),
  {
    loading: () => <Skeleton className="h-[300px] w-full" />,
    ssr: false,
  }
);

export const LazyBarChart = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.BarChart })),
  {
    loading: () => <Skeleton className="h-[300px] w-full" />,
    ssr: false,
  }
);

// Sheet/Dialog components (only load when opened)
export const LazyClientSheet = dynamic(
  () => import("@/components/client-sheet").then((mod) => ({ default: mod.ClientSheet })),
  {
    loading: () => <Skeleton className="h-[600px] w-full" />,
  }
);

export const LazyOrderSheet = dynamic(
  () => import("@/components/order-sheet").then((mod) => ({ default: mod.OrderSheet })),
  {
    loading: () => <Skeleton className="h-[600px] w-full" />,
  }
);

export const LazyMeasurementSheet = dynamic(
  () => import("@/components/measurement-sheet").then((mod) => ({ default: mod.MeasurementSheet })),
  {
    loading: () => <Skeleton className="h-[600px] w-full" />,
  }
);

export const LazyInvoiceDrawer = dynamic(
  () => import("@/components/invoice-details-drawer").then((mod) => ({ default: mod.InvoiceDetailsDrawer })),
  {
    loading: () => <Skeleton className="h-[600px] w-full" />,
  }
);
