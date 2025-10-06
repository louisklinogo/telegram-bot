"use client";

import { trpc } from "@/lib/trpc/client";
import { ComboboxDropdown } from "@/components/ui/combobox-dropdown";
import { Spinner } from "@/components/ui/spinner";
import { useQueryClient } from "@tanstack/react-query";

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
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
    "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B739", "#52C4AB"
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
      className="w-3 h-3 rounded-full flex-shrink-0"
      style={{ backgroundColor: color ?? "#606060" }}
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

export function SelectCategory({
  selected,
  onChange,
  headless,
  hideLoading,
}: Props) {
  const queryClient = useQueryClient();
  
  const { data, isLoading } = trpc.transactionCategories.list.useQuery();
  
  const createMutation = trpc.transactionCategories.create.useMutation({
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: [['transactionCategories', 'list']],
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

  const selectedValue = selected ? {
    id: selected.id,
    label: selected.name,
    color: selected.color ?? getColorFromName(selected.name),
  } : undefined;

  if (!selected && isLoading && !hideLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <ComboboxDropdown
      headless={headless}
      disabled={createMutation.isPending}
      placeholder="Select category"
      searchPlaceholder="Search category"
      items={categories}
      selectedItem={selectedValue}
      onSelect={(item) => {
        onChange({
          id: item.id,
          name: item.label,
          color: item.color,
        });
      }}
      {...(!headless && {
        onCreate: (value) => {
          createMutation.mutate({
            name: value,
            color: getColorFromName(value),
          });
        },
      })}
      renderSelectedItem={(selectedItem) => (
        <div className="flex items-center space-x-2">
          <CategoryColor color={selectedItem.color} />
          <span className="text-left truncate max-w-[90%]">
            {selectedItem.label}
          </span>
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
      renderListItem={({ item }) => (
        <div className="flex items-center space-x-2">
          <CategoryColor color={item.color} />
          <span className="line-clamp-1">{item.label}</span>
        </div>
      )}
    />
  );
}
