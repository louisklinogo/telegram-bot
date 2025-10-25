"use client";

import { createBrowserClient } from "@Faworra/supabase/client";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeSwitch } from "./theme-switch";

export function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const supabase = createBrowserClient();
        const { data } = await supabase.auth.getUser();
        if (mounted) setEmail(data.user?.email ?? null);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const signOut = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    setEmail(null);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer rounded-full">
          <AvatarFallback>
            <span className="text-xs">OM</span>
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[240px]" sideOffset={10}>
        <DropdownMenuLabel>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="line-clamp-1 block max-w-[155px] truncate">
                {email ? email.split("@")[0] : "Guest"}
              </span>
              <span className="truncate font-normal text-muted-foreground text-xs">
                {email || "Not signed in"}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem>Account</DropdownMenuItem>
          <DropdownMenuItem>Support</DropdownMenuItem>
          <DropdownMenuItem>Teams</DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <div className="flex flex-row items-center justify-between p-2">
          <p className="text-sm">Theme</p>
          <ThemeSwitch />
        </div>

        <DropdownMenuSeparator />

        {email ? (
          <DropdownMenuItem className="text-destructive" onClick={signOut}>
            Sign out
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <a href="/login">Sign in</a>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
