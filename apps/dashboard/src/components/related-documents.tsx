"use client";

import { trpc } from "@/lib/trpc/client";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserClient } from "@Faworra/supabase/client";
import { toast } from "sonner";
import { formatFileSize } from "@/lib/upload";
import { formatDistanceToNow } from "date-fns";

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
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg border-dashed">
        <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No documents attached</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((document: any) => (
        <div
          key={document.id}
          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{document.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(document.size)} •{" "}
                {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => handleDownload(document)}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
