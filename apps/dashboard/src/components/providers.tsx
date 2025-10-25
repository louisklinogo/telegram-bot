"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { SidebarProvider } from "@/components/sidebar/sidebar-context";
import { TRPCProvider } from "@/lib/trpc/client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
        <SidebarProvider>{children}</SidebarProvider>
        <Toaster
          closeButton
          icons={{
            success: (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  clipRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  fillRule="evenodd"
                />
              </svg>
            ),
            error: (
              <svg className="h-5 w-5 text-destructive" fill="currentColor" viewBox="0 0 20 20">
                <path
                  clipRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  fillRule="evenodd"
                />
              </svg>
            ),
            warning: (
              <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  clipRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  fillRule="evenodd"
                />
              </svg>
            ),
            info: (
              <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  clipRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  fillRule="evenodd"
                />
              </svg>
            ),
          }}
          position="bottom-left"
          toastOptions={{
            unstyled: true,
            classNames: {
              // Base toast - matches Midday exactly
              toast:
                "group toast flex w-full items-center justify-between gap-2 overflow-hidden border bg-background dark:bg-secondary text-foreground p-5 pr-8 transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-left-full data-[state=open]:slide-in-from-bottom-full",
              // Title - Midday style
              title: "text-sm font-normal",
              // Description - use tokenized muted color
              description: "text-xs text-muted-foreground",
              // Action button - Midday style
              actionButton:
                "inline-flex h-8 shrink-0 items-center justify-center border bg-transparent px-3 text-sm font-medium hover:bg-secondary transition-colors",
              // Cancel button
              cancelButton:
                "inline-flex h-8 shrink-0 items-center justify-center border bg-transparent px-3 text-sm font-medium hover:bg-secondary transition-colors",
              // Close button - appears on hover
              closeButton:
                "absolute right-2 top-2 p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 group-hover:opacity-100",
              // Success - subtle styling, icon handled by Sonner
              success: "bg-background dark:bg-secondary border-border",
              // Error - subtle styling, icon handled by Sonner
              error: "bg-background dark:bg-secondary border-border",
              // Warning
              warning: "bg-background dark:bg-secondary border-border",
              // Info
              info: "bg-background dark:bg-secondary border-border",
              // Loading - spinner
              loading: "bg-background dark:bg-secondary border-border",
            },
          }}
        />
      </ThemeProvider>
    </TRPCProvider>
  );
}
