"use client";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Tag, EyeOff, User, CircleDot } from "lucide-react";
import { SelectCategory } from "./select-category";
import { SelectUser } from "./select-user";

type Props = {
  ids: string[];
  onComplete?: () => void;
};

export function BulkActions({ ids, onComplete }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = trpc.transactions.bulkUpdate.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['transactions', 'list']] });
      // Also invalidate enriched list used by new page
      queryClient.invalidateQueries({ queryKey: [['transactions', 'enrichedList']] });

      onComplete?.();

      toast({
        title: `Updated ${ids.length} transaction${ids.length > 1 ? 's' : ''}`,
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
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Tag className="mr-2 h-4 w-4" />
              <span>Categories</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                sideOffset={14}
                className="p-0 w-[250px] h-[270px]"
              >
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
              <DropdownMenuSubContent
                sideOffset={14}
                className="w-[230px] h-[170px] p-4 space-y-4"
              >
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
