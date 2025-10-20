"use client";

import { formatDistanceToNow } from "date-fns";
import { MoreVertical, Download, Trash2, Eye, FileText, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/ui/use-toast";
import { createBrowserClient } from "@Faworra/supabase/client";
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
import { formatFileSize } from "@/lib/upload";
import { TagEditor } from "./tag-editor";

type VaultTableProps = {
  documents: any[];
};

export function VaultTable({ documents }: VaultTableProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const supabase = createBrowserClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleDownload = async (document: any) => {
    try {
      const { data } = await supabase.storage
        .from("vault")
        .createSignedUrl(document.pathTokens.join("/"), 3600);

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

  const handleDelete = (document: any) => {
    setSelectedDocument(document);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedDocument) {
      deleteMutation.mutate({ id: selectedDocument.id });
      setDeleteDialogOpen(false);
      setSelectedDocument(null);
    }
  };

  const handleShare = async (document: any) => {
    setCopiedId(document.id);

    try {
      // Create a simple share ID (base64 encoded teamId:documentId)
      const shareId = Buffer.from(`${document.teamId}:${document.id}`).toString("base64");
      const shareUrl = `${window.location.origin}/share/${shareId}`;

      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard",
      });

      setTimeout(() => {
        setCopiedId(null);
      }, 3000);
    } catch (error) {
      setCopiedId(null);
      toast({
        title: "Failed to generate share link",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => (
              <TableRow key={document.id} className="group">
                <TableCell>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[300px]">{document.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatFileSize(document.size)}
                </TableCell>
                <TableCell>
                  <TagEditor documentId={document.id} initialTags={document.tags || []} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDistanceToNow(new Date(document.createdAt), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDownload(document)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(document)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare(document)}>
                        {copiedId === document.id ? (
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
                      <DropdownMenuItem
                        onClick={() => handleDelete(document)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedDocument?.name}" from your vault. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
