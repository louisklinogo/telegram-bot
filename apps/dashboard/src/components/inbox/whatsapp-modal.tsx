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
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent className="p-0 sm:max-w-3xl">
        <DialogHeader className="sticky top-0 z-10 border-b bg-background px-5 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-lg leading-none md:text-xl">
                Connect WhatsApp
              </DialogTitle>
              <p className="mt-1 text-muted-foreground text-xs">
                Scan the QR with your phone to pair WhatsApp.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[360px,1fr]">
            {/* Left: QR panel */}
            <div>
              <div className="relative flex items-center justify-center rounded-lg border p-4">
                <div className="flex h-[360px] w-[360px] items-center justify-center rounded-md border border-border bg-background">
                  {loading && !qrCodeUrl ? (
                    <div className="flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-foreground border-b-2" />
                    </div>
                  ) : qrCodeUrl ? (
                    <img
                      alt="WhatsApp QR Code"
                      className="h-[348px] w-[348px] object-contain"
                      src={qrCodeUrl}
                    />
                  ) : (
                    <span aria-live="polite" className="text-muted-foreground text-sm">
                      Waiting for QR…
                    </span>
                  )}
                </div>

                {loading && qrCodeUrl && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/50 backdrop-blur-[1px]">
                    <div className="h-6 w-6 animate-spin rounded-full border-foreground border-b-2" />
                  </div>
                )}
              </div>

              <div className="mt-4 flex w-full flex-col gap-3 sm:flex-row">
                <Button
                  className="flex-1 gap-2"
                  disabled={loading}
                  onClick={fetchQr}
                  variant="default"
                >
                  <WhatsappLogo size={16} weight="duotone" />
                  {loading ? "Refreshing…" : "Refresh QR"}
                </Button>
                <Button className="flex-1" onClick={copyToClipboard} variant="outline">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </Button>
              </div>

              <p className="mt-2 whitespace-nowrap text-[11px] text-muted-foreground">
                WhatsApp → Linked devices → Link a device
              </p>
            </div>

            {/* Right: Steps & tips */}
            <div className="space-y-6">
              <div>
                <h4 className="mb-2 font-medium text-sm">Steps</h4>
                <ol className="list-inside list-decimal space-y-1 text-muted-foreground text-xs">
                  <li>Open WhatsApp on your phone</li>
                  <li>Go to Linked devices → Link a device</li>
                  <li>Point your camera at the QR</li>
                  <li>Messages will start appearing in your inbox</li>
                </ol>
              </div>
              <div>
                <h4 className="mb-2 font-medium text-sm">Things to know</h4>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground text-xs">
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
