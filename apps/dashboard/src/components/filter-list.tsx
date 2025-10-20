"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const listVariant = {
  hidden: { y: 10, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.05,
      staggerChildren: 0.06,
    },
  },
};

const itemVariant = {
  hidden: { y: 10, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

type FilterKey = "start" | "end" | "tags";

type FilterValue = {
  start?: string;
  end?: string;
  tags?: string[];
};

interface Props {
  filters: Partial<FilterValue>;
  loading?: boolean;
  onRemove: (filters: { [key: string]: null }) => void;
}

export function FilterList({ filters, loading, onRemove }: Props) {
  const renderFilter = (key: FilterKey, value: any) => {
    switch (key) {
      case "start": {
        if (value && filters.end) {
          return `${format(new Date(value), "MMM d")} - ${format(new Date(filters.end), "MMM d, yyyy")}`;
        }
        return value && format(new Date(value), "MMM d, yyyy");
      }

      case "tags": {
        if (!value || !Array.isArray(value)) return null;
        return value.join(", ");
      }

      default:
        return null;
    }
  };

  const handleOnRemove = (key: FilterKey) => {
    if (key === "start" || key === "end") {
      onRemove({ start: null, end: null });
      return;
    }

    onRemove({ [key]: null });
  };

  return (
    <motion.ul variants={listVariant} initial="hidden" animate="show" className="flex space-x-2">
      {loading && (
        <div className="flex space-x-2">
          <motion.li key="1" variants={itemVariant}>
            <Skeleton className="h-9 w-[100px]" />
          </motion.li>
          <motion.li key="2" variants={itemVariant}>
            <Skeleton className="h-9 w-[100px]" />
          </motion.li>
        </div>
      )}

      {!loading &&
        Object.entries(filters)
          .filter(([key, value]) => value !== null && key !== "end")
          .map(([key, value]) => {
            const filterKey = key as FilterKey;
            const renderedValue = renderFilter(filterKey, value);

            if (!renderedValue) return null;

            return (
              <motion.li key={key} variants={itemVariant}>
                <Button
                  className="h-9 px-2 bg-secondary hover:bg-secondary font-normal text-muted-foreground flex space-x-1 items-center group rounded-none"
                  onClick={() => handleOnRemove(filterKey)}
                >
                  <X className="scale-0 group-hover:scale-100 transition-all w-0 group-hover:w-4 h-4" />
                  <span>{renderedValue}</span>
                </Button>
              </motion.li>
            );
          })}
    </motion.ul>
  );
}
