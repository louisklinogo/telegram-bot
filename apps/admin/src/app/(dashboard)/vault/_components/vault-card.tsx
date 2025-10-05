"use client";

import { MoreVertical, Download, Trash2, Eye, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/ui/use-toast";
import { createBrowserClient } from "@cimantikos/supabase/client";
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
import { TagEditor } from "./tag-editor";
import { cn } from "@/lib/utils";
import { useVaultStore } from "@/stores/vault-store";
import { FilePreviewIcon } from "@/components/file-preview-icon";

type VaultCardProps = {
  document: any;
};

export function VaultCard({ document }: VaultCardProps) {
  const { toast } = useToast();
  const isLoading = document.processingStatus === "pending";
  const utils = trpc.useUtils();
  const supabase = createBrowserClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { selectedDocuments, toggleDocument } = useVaultStore();
  const isSelected = selectedDocuments.has(document.id);
  const [isCopied, setIsCopied] = useState(false);

  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Document deleted",
        description: "The document has been removed from your vault",
      });
      utils.documents.list.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const { data } = await supabase.storage
        .from("vault")
        .createSignedUrl(document.pathTokens.join("/"), 3600); // 1 hour expiry

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download the file",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate({ id: document.id });
    setShowDeleteDialog(false);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCopied(true);

    try {
      // Create a simple share ID (base64 encoded teamId:documentId)
      // In production, this would create a short_links record in the database
      const shareId = Buffer.from(`${document.teamId}:${document.id}`).toString("base64");
      const shareUrl = `${window.location.origin}/share/${shareId}`;

      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard",
      });

      setTimeout(() => {
        setIsCopied(false);
      }, 3000);
    } catch (error) {
      setIsCopied(false);
      toast({
        title: "Failed to generate share link",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className={cn(
        "h-72 border relative flex text-muted-foreground p-4 flex-col gap-3 hover:bg-accent dark:hover:bg-[#141414] transition-colors duration-200 group cursor-pointer",
        isSelected && "ring-2 ring-primary"
      )}>
        {/* Checkbox for selection - top right, always visible when selected or on hover */}
        <div className={cn(
          "absolute top-2 left-2 transition-opacity duration-200 z-10",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleDocument(document.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownload}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare}>
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <button
          type="button"
          className="w-[60px] h-[84px] flex items-center justify-center"
        >
          {isLoading ? (
            <Skeleton className="w-[60px] h-[84px]" />
          ) : (
            <FilePreviewIcon mimeType={document.mimeType} className="w-8 h-8" />
          )}
        </button>

        <div className="flex flex-col text-left">
          <h2 className="text-sm text-primary line-clamp-1 mb-2 mt-3">
            {isLoading ? (
              <Skeleton className="w-[80%] h-4" />
            ) : (
              document.name
            )}
          </h2>

          {isLoading ? (
            <Skeleton className="w-[50%] h-4" />
          ) : (
            <p className="text-xs text-muted-foreground line-clamp-3">
              {document.metadata?.description || "No description"}
            </p>
          )}
        </div>

        <div className="mt-auto">
          <TagEditor documentId={document.id} initialTags={document.tags || []} />
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{document.name}" from your vault. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
