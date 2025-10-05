"use client";

import { UserMenu } from "@/components/sidebar/user-menu";

export function Header() {
  return (
    <header className="z-40 px-6 border-b h-[70px] flex justify-between items-center sticky top-0 bg-background">
      <div className="flex-1" />

      <div className="flex items-center gap-2 ml-auto">
        <UserMenu />
      </div>
    </header>
  );
}
