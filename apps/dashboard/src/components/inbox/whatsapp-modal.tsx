"use client";

import { Copy } from "lucide-react";
import { WhatsappLogo } from "phosphor-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsAppModal({ isOpen, onClose }: WhatsAppModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchQr = async () => {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    setLoading(true);
    try {
      const res = await fetch(`${base}/providers/whatsapp/baileys/session/qr?externalId=primary`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json?.status === "connected") {
        // Auto-close when connected
        onClose();
        return;
      }
      if (json?.qr) {
        const dataUrl = await QRCode.toDataURL(json.qr, { width: 256, margin: 2 });
        setQrCodeUrl(dataUrl);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    // Start polling for QR updates
    fetchQr();
    pollRef.current = setInterval(fetchQr, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText("primary");
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl p-0">
        <DialogHeader className="sticky top-0 z-10 bg-background px-5 pt-5 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-lg md:text-xl leading-none">Connect WhatsApp</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">Scan the QR with your phone to pair WhatsApp.</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-[360px,1fr] gap-8">
            {/* Left: QR panel */}
            <div>
              <div className="relative border rounded-lg p-4 flex items-center justify-center">
                <div className="w-[360px] h-[360px] border border-border rounded-md flex items-center justify-center bg-background">
                  {loading && !qrCodeUrl ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
                    </div>
                  ) : qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="WhatsApp QR Code" className="w-[348px] h-[348px] object-contain" />
                  ) : (
                    <span className="text-sm text-muted-foreground" aria-live="polite">Waiting for QR…</span>
                  )}
                </div>

                {loading && qrCodeUrl && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] rounded-lg flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground" />
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3 w-full">
                <Button onClick={fetchQr} className="flex-1 gap-2" variant="default" disabled={loading}>
                  <WhatsappLogo size={16} weight="duotone" />
                  {loading ? "Refreshing…" : "Refresh QR"}
                </Button>
                <Button onClick={copyToClipboard} variant="outline" className="flex-1">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </Button>
              </div>

              <p className="mt-2 text-[11px] text-muted-foreground whitespace-nowrap">WhatsApp → Linked devices → Link a device</p>
            </div>

            {/* Right: Steps & tips */}
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-2">Steps</h4>
                <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
                  <li>Open WhatsApp on your phone</li>
                  <li>Go to Linked devices → Link a device</li>
                  <li>Point your camera at the QR</li>
                  <li>Messages will start appearing in your inbox</li>
                </ol>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Things to know</h4>
                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                  <li>Keep your phone powered and online for a steady connection.</li>
                  <li>If the session pauses, re‑scan — it takes under a minute.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
