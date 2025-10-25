"use client";

import { UserMenu } from "@/components/sidebar/user-menu";

export function Header() {
  return (
    <header className="sticky top-0 z-40 flex h-[70px] items-center justify-between border-b bg-background px-6">
      <div className="flex-1" />

      <div className="ml-auto flex items-center gap-2">
        <UserMenu />
      </div>
    </header>
  );
}
