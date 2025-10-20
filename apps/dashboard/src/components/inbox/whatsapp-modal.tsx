"use client";

import { Copy } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { WhatsAppLogo } from "./assets/whatsapp-logo";

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
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center space-y-6 p-8 pt-10">
          {loading && !qrCodeUrl ? (
            <div className="flex items-center justify-center w-64 h-64 border-2 border-dashed border-border rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
            </div>
          ) : qrCodeUrl ? (
            <div className="bg-background">
              <img src={qrCodeUrl} alt="WhatsApp QR Code" className="size-40" />
            </div>
          ) : (
            <div className="w-64 h-64 border border-border flex items-center justify-center text-sm text-muted-foreground rounded-md">
              Waiting for QR...
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 w-full border-t-[1px] pt-8">
            <Button onClick={fetchQr} className="flex-1 gap-2 whitespace-nowrap" variant="default">
              <WhatsAppLogo />
              Refresh QR
            </Button>
            <Button
              onClick={copyToClipboard}
              variant="outline"
              className="flex-1 whitespace-nowrap"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center max-w-sm">
            <ol className="list-decimal list-inside space-y-1 mt-1">
              <li>Send the pre-filled message to start the conversation</li>
              <li>Share customer inquiries and measurement photos</li>
              <li>We'll automatically organize messages in your inbox</li>
              <li>Conversations will appear in your dashboard for review</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
