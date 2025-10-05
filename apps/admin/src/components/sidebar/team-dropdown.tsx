"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type TeamRow = { id: string; name: string | null };

type TeamDropdownProps = {
  isExpanded?: boolean;
  teams?: { team: { id: string; name: string | null } }[];
  currentTeamId?: string;
};

export function TeamDropdown({ isExpanded = false, teams = [], currentTeamId }: TeamDropdownProps) {
  // ✅ OPTIMIZED: Receives teams from Server Component (no client-side fetch!)
  const [current, setCurrent] = useState<string | null>(currentTeamId || null);

  // Transform teams data
  const teamsList: TeamRow[] = teams.map((t) => ({
    id: t.team.id,
    name: t.team.name,
  }));

  const setTeam = async (id: string) => {
    try {
      await fetch(`/api/teams/launch?teamId=${id}`, { method: "POST" });
      setCurrent(id);
      if (typeof window !== "undefined") window.location.reload();
    } catch {}
  };

  const currentTeam = teamsList.find((t) => t.id === current) || teamsList[0] || null;
  const initials = (currentTeam?.name || "TM").slice(0, 2).toUpperCase();

  return (
    <div className="absolute left-[19px] bottom-4 flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className="w-[32px] h-[32px] rounded-none border cursor-pointer">
            <AvatarFallback className="rounded-none text-xs">{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          {teamsList.map((t) => (
            <DropdownMenuItem key={t.id} onClick={() => setTeam(t.id)}>
              {t.name || t.id}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {isExpanded && currentTeam?.name && (
        <span className="text-sm text-primary truncate max-w-[140px]">{currentTeam.name}</span>
      )}
    </div>
  );
}
