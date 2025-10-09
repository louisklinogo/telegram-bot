import { db } from "@/lib/trpc/server";
import { getDocumentById } from "@cimantikos/database/queries";
import { createServerClient } from "@cimantikos/supabase/server";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";

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

    if (!teamId || !documentId) {
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
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b">
          <div className="container mx-auto px-6 py-4">
            <h2 className="text-lg font-semibold">Cimantikós</h2>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold">Download File</h1>
              <p className="text-muted-foreground">A file has been shared with you</p>
            </div>

            {/* File Info Card */}
            <div className="border rounded-lg p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{document.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(document.size ?? undefined)}
                    {document.mimeType && ` • ${document.mimeType.split("/")[1]?.toUpperCase()}`}
                  </p>
                </div>
              </div>

              <a href={downloadUrl} download className="block">
                <Button className="w-full" size="lg">
                  <Download className="w-4 h-4 mr-2" />
                  Download File
                </Button>
              </a>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              This download link is secure and will expire in 1 hour.
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t py-6">
          <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
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
