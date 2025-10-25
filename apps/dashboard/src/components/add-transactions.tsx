"use client";

import { FileUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTransactionParams } from "@/hooks/use-transaction-params";

type Props = {
  onCreate?: () => void;
};

export function AddTransactions({ onCreate }: Props) {
  const { open } = useTransactionParams();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="outline">
          <Plus className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10}>
        <DropdownMenuItem
          className="space-x-2"
          onClick={() => {
            if (onCreate) onCreate();
            else open();
          }}
        >
          <Plus className="h-4 w-4" />
          <span>Create transaction</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="space-x-2 opacity-50" disabled>
          <FileUp className="h-4 w-4" />
          <span>Import/backfill</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
