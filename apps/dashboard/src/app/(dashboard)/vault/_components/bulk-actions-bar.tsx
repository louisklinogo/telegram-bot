"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Trash2, X } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/lib/trpc/client";
import { useVaultStore } from "@/stores/vault-store";

export function BulkActionsBar() {
  const { selectedDocuments, clearSelection } = useVaultStore();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate();
    },
  });

  const handleBulkDelete = async () => {
    const selectedIds = Array.from(selectedDocuments);
    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      try {
        await deleteMutation.mutateAsync({ id });
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast({
        title: "Documents deleted",
        description: `${successCount} document${successCount > 1 ? "s" : ""} deleted successfully`,
      });
    }

    if (errorCount > 0) {
      toast({
        title: "Some deletions failed",
        description: `Failed to delete ${errorCount} document${errorCount > 1 ? "s" : ""}`,
        variant: "destructive",
      });
    }

    clearSelection();
    setShowDeleteDialog(false);
  };

  const selectedCount = selectedDocuments.size;

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        <motion.div
          animate={{ y: 0, opacity: 1 }}
          className="-translate-x-1/2 fixed bottom-6 left-1/2 z-50"
          exit={{ y: 100, opacity: 0 }}
          initial={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="flex items-center gap-4 rounded-lg border bg-background p-4 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {selectedCount} document{selectedCount > 1 ? "s" : ""} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                disabled={deleteMutation.isPending}
                onClick={() => setShowDeleteDialog(true)}
                size="sm"
                variant="destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>

              <Button onClick={clearSelection} size="sm" variant="ghost">
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount} document{selectedCount > 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCount} document{selectedCount > 1 ? "s" : ""}{" "}
              from your vault. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              disabled={deleteMutation.isPending}
              onClick={handleBulkDelete}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
