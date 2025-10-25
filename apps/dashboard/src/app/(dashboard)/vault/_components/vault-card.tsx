"use client";

import { createBrowserClient } from "@Faworra/supabase/client";
import { Check, Copy, Download, Eye, MoreVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import { FilePreviewIcon } from "@/components/file-preview-icon";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useVaultStore } from "@/stores/vault-store";
import { TagEditor } from "./tag-editor";

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
      <div
        className={cn(
          "group relative flex h-72 cursor-pointer flex-col gap-3 border p-4 text-muted-foreground transition-colors duration-200 hover:bg-accent dark:hover:bg-secondary",
          isSelected && "ring-2 ring-primary"
        )}
      >
        {/* Checkbox for selection - top right, always visible when selected or on hover */}
        <div
          className={cn(
            "absolute top-2 left-2 z-10 transition-opacity duration-200",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleDocument(document.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <div className="absolute top-2 right-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button className="h-8 w-8 p-0" size="sm" variant="ghost">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownload}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare}>
                {isCopied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <button className="flex h-[84px] w-[60px] items-center justify-center" type="button">
          {isLoading ? (
            <Skeleton className="h-[84px] w-[60px]" />
          ) : (
            <FilePreviewIcon className="h-8 w-8" mimeType={document.mimeType} />
          )}
        </button>

        <div className="flex flex-col text-left">
          <h2 className="mt-3 mb-2 line-clamp-1 text-primary text-sm">
            {isLoading ? <Skeleton className="h-4 w-[80%]" /> : document.name}
          </h2>

          {isLoading ? (
            <Skeleton className="h-4 w-[50%]" />
          ) : (
            <p className="line-clamp-3 text-muted-foreground text-xs">
              {document.metadata?.description || "No description"}
            </p>
          )}
        </div>

        <div className="mt-auto">
          <TagEditor documentId={document.id} initialTags={document.tags || []} />
        </div>
      </div>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{document.name}" from your vault. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
