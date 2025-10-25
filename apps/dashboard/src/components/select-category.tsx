"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ComboboxDropdown } from "@/components/ui/combobox-dropdown";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc/client";

type Selected = {
  id: string;
  name: string;
  color?: string | null;
};

type Props = {
  selected?: Selected;
  onChange: (selected: Selected) => void;
  headless?: boolean;
  hideLoading?: boolean;
};

function getColorFromName(name: string): string {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E2",
    "#F8B739",
    "#52C4AB",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function CategoryColor({ color }: { color?: string | null }) {
  return (
    <div
      className="h-3 w-3 flex-shrink-0 rounded-full"
      style={{ backgroundColor: color ?? "hsl(var(--muted-foreground))" }}
    />
  );
}

function flattenCategories(categories: any[]): any[] {
  const flattened: any[] = [];

  for (const category of categories) {
    flattened.push({
      id: category.id,
      label: category.name,
      color: category.color ?? getColorFromName(category.name),
      isChild: false,
    });

    if (category.children && category.children.length > 0) {
      for (const child of category.children) {
        flattened.push({
          id: child.id,
          label: `  ${child.name}`,
          color: child.color ?? getColorFromName(child.name),
          isChild: true,
          parentId: category.id,
        });
      }
    }
  }

  return flattened;
}

export function SelectCategory({ selected, onChange, headless, hideLoading }: Props) {
  const queryClient = useQueryClient();

  const { data, isLoading } = trpc.transactionCategories.list.useQuery();

  const createMutation = trpc.transactionCategories.create.useMutation({
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: [["transactionCategories", "list"]],
      });

      if (data) {
        onChange({
          id: data.id,
          name: data.name,
          color: data.color,
        });
      }
    },
  });

  const categories = data ? flattenCategories(data) : [];

  const selectedValue = selected
    ? {
        id: selected.id,
        label: selected.name,
        color: selected.color ?? getColorFromName(selected.name),
      }
    : undefined;

  if (!selected && isLoading && !hideLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <ComboboxDropdown
      disabled={createMutation.isPending}
      headless={headless}
      items={categories}
      onSelect={(item) => {
        onChange({
          id: item.id,
          name: item.label,
          color: item.color,
        });
      }}
      placeholder="Select category"
      searchPlaceholder="Search category"
      selectedItem={selectedValue}
      {...(!headless && {
        onCreate: (value) => {
          createMutation.mutate({
            name: value,
            color: getColorFromName(value),
          });
        },
      })}
      renderListItem={({ item }) => (
        <div className="flex items-center space-x-2">
          <CategoryColor color={item.color} />
          <span className="line-clamp-1">{item.label}</span>
        </div>
      )}
      renderOnCreate={(value) => {
        if (!headless) {
          return (
            <div className="flex items-center space-x-2">
              <CategoryColor color={getColorFromName(value)} />
              <span>{`Create "${value}"`}</span>
            </div>
          );
        }
      }}
      renderSelectedItem={(selectedItem) => (
        <div className="flex items-center space-x-2">
          <CategoryColor color={selectedItem.color} />
          <span className="max-w-[90%] truncate text-left">{selectedItem.label}</span>
        </div>
      )}
    />
  );
}
