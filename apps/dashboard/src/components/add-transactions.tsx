"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, FileUp } from "lucide-react";
import { useTransactionParams } from "@/hooks/use-transaction-params";

type Props = {
  onCreate?: () => void;
};

export function AddTransactions({ onCreate }: Props) {
  const { open } = useTransactionParams();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={10} align="end">
        <DropdownMenuItem
          onClick={() => {
            if (onCreate) onCreate();
            else open();
          }}
          className="space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create transaction</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="space-x-2 opacity-50">
          <FileUp className="h-4 w-4" />
          <span>Import/backfill</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
