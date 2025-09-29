"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { queryClient } from "@/lib/query-client";
import { SidebarProvider } from "@/components/sidebar/sidebar-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>{children}</SidebarProvider>
      <Toaster position="top-right" richColors />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
