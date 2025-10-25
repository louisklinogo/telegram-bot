import { getDocumentById } from "@Faworra/database/queries";
import { createServerClient } from "@Faworra/supabase/server";
import { Download, FileText } from "lucide-react";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/trpc/server";

type Props = {
  params: Promise<{ shareId: string }>;
};

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function SharePage({ params }: Props) {
  const { shareId } = await params;

  // For now, shareId is the document ID (temporary until we implement short_links table)
  // In production, this would query the short_links table

  try {
    // Decode the shareId (which contains teamId:documentId)
    const [teamId, documentId] = Buffer.from(shareId, "base64").toString().split(":");

    if (!(teamId && documentId)) {
      notFound();
    }

    const document = await getDocumentById(db, {
      id: documentId,
      teamId,
    });

    if (!document) {
      notFound();
    }

    const supabase = await createServerClient();

    // Generate signed URL for download
    const { data, error } = await supabase.storage
      .from("vault")
      .createSignedUrl((document.pathTokens ?? []).join("/"), 60 * 60); // 1 hour

    if (error || !data?.signedUrl) {
      throw new Error("Failed to generate download link");
    }

    const downloadUrl = data.signedUrl;

    return (
      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <header className="border-b">
          <div className="container mx-auto px-6 py-4">
            <h2 className="font-semibold text-lg">Cimantikós</h2>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-2 text-center">
              <h1 className="font-semibold text-2xl">Download File</h1>
              <p className="text-muted-foreground">A file has been shared with you</p>
            </div>

            {/* File Info Card */}
            <div className="space-y-6 rounded-lg border p-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{document.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatFileSize(document.size ?? undefined)}
                    {document.mimeType && ` • ${document.mimeType.split("/")[1]?.toUpperCase()}`}
                  </p>
                </div>
              </div>

              <a className="block" download href={downloadUrl}>
                <Button className="w-full" size="lg">
                  <Download className="mr-2 h-4 w-4" />
                  Download File
                </Button>
              </a>
            </div>

            <p className="text-center text-muted-foreground text-xs">
              This download link is secure and will expire in 1 hour.
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t py-6">
          <div className="container mx-auto px-6 text-center text-muted-foreground text-sm">
            Powered by Cimantikós
          </div>
        </footer>
      </div>
    );
  } catch (error) {
    console.error("Share page error:", error);
    notFound();
  }
}
