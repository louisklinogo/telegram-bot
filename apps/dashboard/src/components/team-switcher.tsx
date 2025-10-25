"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc/client";

type TeamRow = { id: string; name: string | null };

export function TeamSwitcher() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const { data: list } = trpc.teams.list.useQuery();
  const { data: currentQ } = trpc.teams.current.useQuery();
  const setCurrentM = trpc.teams.setCurrent.useMutation({
    onSuccess: () => {
      if (typeof window !== "undefined") window.location.reload();
    },
  });

  useEffect(() => {
    if (list) setTeams(list as TeamRow[]);
    if (currentQ) setCurrent(currentQ.teamId || null);
  }, [list, currentQ]);

  const onSelect = (teamId: string) => {
    setCurrentM.mutate({ teamId });
  };

  const label = teams.find((t) => t.id === current)?.name || "Select team";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {teams.map((t) => (
          <DropdownMenuItem key={t.id} onClick={() => onSelect(t.id)}>
            {t.name || t.id}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
