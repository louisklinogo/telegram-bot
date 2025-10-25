"use client";

import { Button } from "@midday/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@midday/ui/dialog";
import { Icons } from "@midday/ui/icons";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  inboxId: string;
}

export function WhatsAppModal({ isOpen, onClose, inboxId }: WhatsAppModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // WhatsApp number - this should be configured in environment variables
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "1234567890";

  const message = `Hello! I'd like to connect my WhatsApp to Midday for document processing. My inbox ID is: ${inboxId}`;
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  useEffect(() => {
    if (isOpen) {
      generateQRCode();
    }
  }, [isOpen, whatsappUrl]);

  const generateQRCode = async () => {
    setIsGenerating(true);

    try {
      const url = await QRCode.toDataURL(whatsappUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      setQrCodeUrl(url);
    } catch (error) {
      console.error("Error generating QR code:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(whatsappUrl);
      // You could add a toast notification here
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const openWhatsApp = () => {
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center space-y-6 p-8 pt-10">
          {isGenerating ? (
            <div className="flex h-64 w-64 items-center justify-center rounded-lg border-2 border-gray-300 border-dashed">
              <div className="h-8 w-8 animate-spin rounded-full border-gray-900 border-b-2" />
            </div>
          ) : (
            <div className="bg-white">
              <img alt="WhatsApp QR Code" className="size-40" src={qrCodeUrl} />
            </div>
          )}

          <div className="flex w-full flex-col gap-4 border-t-[1px] pt-8 sm:flex-row">
            <Button className="flex-1" onClick={openWhatsApp} variant="default">
              <Icons.WhatsApp className="mr-2 h-4 w-4" />
              Open WhatsApp
            </Button>
            <Button className="flex-1" onClick={copyToClipboard} variant="outline">
              <Icons.Copy className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
          </div>

          <div className="max-w-sm text-center text-[#878787] text-xs">
            <ol className="mt-1 list-inside list-decimal space-y-1">
              <li>Send the pre-filled message to start the conversation</li>
              <li>Forward or send photos of your receipts and invoices</li>
              <li>We'll automatically extract the data and process them</li>
              <li>Documents will appear in your inbox for review</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
