"use client";

import { createBrowserClient } from "@Faworra/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { formatFileSize } from "@/lib/upload";

type RelatedDocumentsProps = {
  orderId?: string;
  invoiceId?: string;
  clientId?: string;
};

export function RelatedDocuments({ orderId, invoiceId, clientId }: RelatedDocumentsProps) {
  const supabase = createBrowserClient();

  const { data, isLoading } = trpc.documents.list.useQuery({
    ...(orderId && { orderId }),
    ...(invoiceId && { invoiceId }),
    ...(clientId && { clientId }),
    limit: 50,
  });

  // Handle both array format (old) and object format with items (new)
  const documents = Array.isArray(data) ? data : (data?.items ?? []);

  const handleDownload = async (document: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("vault")
        .createSignedUrl(document.pathTokens.join("/"), 3600);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div className="h-16 animate-pulse rounded-lg bg-muted" key={i} />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-8 text-center">
        <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">No documents attached</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((document: any) => (
        <div
          className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
          key={document.id}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-sm">{document.name}</p>
              <p className="text-muted-foreground text-xs">
                {formatFileSize(document.size)} •{" "}
                {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          <Button onClick={() => handleDownload(document)} size="sm" variant="ghost">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
