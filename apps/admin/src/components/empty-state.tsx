"use client";

import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  title: string;
  description: string | React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center mt-40">
        <div className="text-center mb-6 space-y-2">
          <h2 className="font-medium text-lg">{title}</h2>
          {typeof description === "string" ? (
            <p className="text-[#606060] text-sm">{description}</p>
          ) : (
            <div className="text-[#606060] text-sm">{description}</div>
          )}
        </div>

        {action && (
          <Button variant="outline" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
