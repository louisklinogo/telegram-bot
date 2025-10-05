"use client";

import * as React from "react";

type LoadMoreProps = {
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
};

export const LoadMore = React.forwardRef<HTMLDivElement, LoadMoreProps>(
  ({ hasNextPage, isFetchingNextPage }, ref) => {
    if (!hasNextPage) {
      return null;
    }

    return (
      <div
        ref={ref}
        className="flex justify-center items-center h-16 text-sm text-muted-foreground"
      >
        {isFetchingNextPage ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Loading more...</span>
          </div>
        ) : (
          <span>Scroll to load more</span>
        )}
      </div>
    );
  }
);

LoadMore.displayName = "LoadMore";
