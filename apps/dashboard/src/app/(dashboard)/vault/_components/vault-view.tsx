"use client";

import { trpc } from "@/lib/trpc/client";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useVaultParams } from "@/hooks/use-vault-params";
import { useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { createBrowserClient } from "@Faworra/supabase/client";
import { VaultGrid } from "./vault-grid";
import { VaultTable } from "./vault-table";
import { VaultEmptyState } from "./vault-empty-state";
import { BulkActionsBar } from "./bulk-actions-bar";
import { VaultHeader } from "./vault-header";
import { VaultBreadcrumb } from "./vault-breadcrumb";
import { FolderCard } from "./folder-card";

type VaultViewProps = {
  initialData: any[];
  teamId: string;
};

export function VaultView({ initialData = [], teamId }: VaultViewProps) {
  const { params, setParams } = useVaultParams();
  const t = trpc.useUtils();
  const { ref, inView } = useInView();
  const supabase = createBrowserClient();

  const {
    data: pages,
    fetchNextPage,
    hasNextPage,
    isFetching,
    refetch,
  } = useSuspenseInfiniteQuery({
    ...t.documents.list.infiniteQueryOptions(
      {
        q: params.q || undefined,
        tags: params.tags || undefined,
        start: params.start || undefined,
        end: params.end || undefined,
        limit: 20,
      },
      {
        getNextPageParam: (lastPage) => lastPage.meta?.cursor,
      },
    ),
    initialData:
      initialData.length > 0
        ? {
            pages: [{ items: initialData, meta: { cursor: null, hasMore: false } }],
            pageParams: [null],
          }
        : undefined,
  });

  const documents = useMemo(() => {
    return pages?.pages.flatMap((page) => page.items) ?? [];
  }, [pages]);

  // Get current folder path
  const currentPath = params.folder || [];

  // Extract folders and files for current level
  const { folders, files } = useMemo(() => {
    const foldersMap = new Map<string, number>();
    const filteredFiles: any[] = [];

    for (const doc of documents) {
      const pathTokens = doc.pathTokens || [];

      // Check if document is in current path or subfolders
      const isInCurrentPath = currentPath.every((folder, i) => pathTokens[i] === folder);

      if (!isInCurrentPath) continue;

      // If document is directly in current folder
      if (pathTokens.length === currentPath.length) {
        filteredFiles.push(doc);
      }
      // If document is in a subfolder
      else if (pathTokens.length > currentPath.length) {
        const nextFolder = pathTokens[currentPath.length];
        foldersMap.set(nextFolder, (foldersMap.get(nextFolder) || 0) + 1);
      }
    }

    return {
      folders: Array.from(foldersMap.entries()).map(([name, count]) => ({ name, count })),
      files: filteredFiles,
    };
  }, [documents, currentPath]);

  // Infinite scroll trigger
  useEffect(() => {
    if (inView && hasNextPage && !isFetching) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetching, fetchNextPage]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("documents_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "documents",
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          // Refetch documents on any change
          refetch();
          t.documents.list.invalidate();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, supabase, refetch, t]);

  // Empty state
  if (!documents.length && !isFetching) {
    return <VaultEmptyState teamId={teamId} />;
  }

  const handleNavigateFolder = (path: string[]) => {
    setParams({ folder: path.length > 0 ? path : null });
  };

  const handleOpenFolder = (folderName: string) => {
    setParams({ folder: [...currentPath, folderName] });
  };

  return (
    <>
      <VaultHeader documents={files} teamId={teamId} />

      {/* Breadcrumb */}
      {currentPath.length > 0 && (
        <div className="mb-4">
          <VaultBreadcrumb path={currentPath} onNavigate={handleNavigateFolder} />
        </div>
      )}

      <div>
        {params.view === "list" ? (
          <VaultTable documents={files} />
        ) : (
          <VaultGrid documents={files} folders={folders} onOpenFolder={handleOpenFolder} />
        )}

        {/* Load more trigger */}
        {hasNextPage && (
          <div ref={ref} className="flex justify-center py-8">
            <div className="text-sm text-muted-foreground">
              {isFetching ? "Loading more..." : "Load more"}
            </div>
          </div>
        )}
      </div>

      {/* Bulk actions bottom bar */}
      <BulkActionsBar />
    </>
  );
}
