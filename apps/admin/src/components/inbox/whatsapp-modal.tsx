"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Copy } from "lucide-react";
import { WhatsAppLogo } from "./assets/whatsapp-logo";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsAppModal({ isOpen, onClose }: WhatsAppModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "233244000000";
  
  const message = `Hello! I'd like to connect my WhatsApp to Cimantikós for customer communications and order updates.`;
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
      // Add toast notification here if needed
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const openWhatsApp = () => {
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center space-y-6 p-8 pt-10">
          {isGenerating ? (
            <div className="flex items-center justify-center w-64 h-64 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : (
            <div className="bg-white">
              <img src={qrCodeUrl} alt="WhatsApp QR Code" className="size-40" />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 w-full border-t-[1px] pt-8">
            <Button onClick={openWhatsApp} className="flex-1 gap-2 whitespace-nowrap" variant="default">
              <WhatsAppLogo />
              Open WhatsApp
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

          <div className="text-xs text-[#878787] text-center max-w-sm">
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
