"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useVaultStore } from "@/stores/vault-store";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";

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
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-background border shadow-lg rounded-lg p-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {selectedCount} document{selectedCount > 1 ? "s" : ""} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>

              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
