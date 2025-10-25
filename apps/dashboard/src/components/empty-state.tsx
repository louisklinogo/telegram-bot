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
      <div className="mt-40 flex flex-col items-center">
        <div className="mb-6 space-y-2 text-center">
          <h2 className="text-balance font-medium text-lg">{title}</h2>
          {typeof description === "string" ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : (
            <div className="text-muted-foreground text-sm">{description}</div>
          )}
        </div>

        {action && (
          <Button onClick={action.onClick} variant="outline">
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
