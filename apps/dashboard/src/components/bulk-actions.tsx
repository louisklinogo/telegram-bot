"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Ban, ChevronDown, CircleDot, EyeOff, RotateCcw, Tag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/lib/trpc/client";
import { SelectCategory } from "./select-category";
import { SelectUser } from "./select-user";

type Props = {
  ids: string[];
  onComplete?: () => void;
};

export function BulkActions({ ids, onComplete }: Props) {
  const { toast } = useToast();
  const _queryClient = useQueryClient();
  const utils = trpc.useUtils();

  const updateMutation = trpc.transactions.bulkUpdate.useMutation({
    onSuccess: () => {
      utils.transactions.enrichedList.invalidate();
      utils.transactions.list.invalidate();

      onComplete?.();

      toast({
        title: `Updated ${ids.length} transaction${ids.length > 1 ? "s" : ""}`,
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update transactions",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="space-x-2">
          <span>Actions</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]" sideOffset={8}>
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => {
              updateMutation.mutate({
                transactionIds: ids,
                updates: { status: "cancelled", excludeFromAnalytics: true },
              });
            }}
          >
            <Ban className="mr-2 h-4 w-4" />
            Void
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              updateMutation.mutate({
                transactionIds: ids,
                updates: { status: "pending", excludeFromAnalytics: false },
              });
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Unvoid
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Tag className="mr-2 h-4 w-4" />
              <span>Categories</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent sideOffset={14} className="p-0 w-[250px] h-[270px]">
                <SelectCategory
                  onChange={(selected) => {
                    updateMutation.mutate({
                      transactionIds: ids,
                      updates: { categorySlug: selected.id },
                    });
                  }}
                  headless
                />
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <EyeOff className="mr-2 h-4 w-4" />
              <span>Exclude</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent sideOffset={14}>
                <DropdownMenuCheckboxItem
                  onCheckedChange={() => {
                    updateMutation.mutate({
                      transactionIds: ids,
                      updates: { excludeFromAnalytics: true },
                    });
                  }}
                >
                  Yes
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  onCheckedChange={() => {
                    updateMutation.mutate({
                      transactionIds: ids,
                      updates: { excludeFromAnalytics: false },
                    });
                  }}
                >
                  No
                </DropdownMenuCheckboxItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <User className="mr-2 h-4 w-4" />
              <span>Assign</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent sideOffset={14} className="w-[230px] h-[170px] p-4 space-y-4">
                <SelectUser
                  onSelect={(selected) => {
                    updateMutation.mutate({
                      transactionIds: ids,
                      updates: { assignedId: selected.id },
                    });
                  }}
                />
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <CircleDot className="mr-2 h-4 w-4" />
              <span>Status</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent sideOffset={14}>
                <DropdownMenuCheckboxItem
                  onCheckedChange={() => {
                    updateMutation.mutate({
                      transactionIds: ids,
                      updates: { status: "completed" },
                    });
                  }}
                >
                  Completed
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  onCheckedChange={() => {
                    updateMutation.mutate({
                      transactionIds: ids,
                      updates: { status: "pending" },
                    });
                  }}
                >
                  Pending
                </DropdownMenuCheckboxItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
