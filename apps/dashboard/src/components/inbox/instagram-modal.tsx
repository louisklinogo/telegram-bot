"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InstagramLogo } from "./assets/instagram-logo";

interface InstagramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstagramModal({ isOpen, onClose }: InstagramModalProps) {
  const handleConnect = () => {
    // TODO: Implement Instagram OAuth flow
    window.open("https://www.facebook.com/v21.0/dialog/oauth", "_blank");
  };

  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Instagram</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-6 p-8 pt-10">
          <div className="flex flex-col items-center space-y-4">
            <div className="scale-150">
              <InstagramLogo />
            </div>
            <div className="text-center">
              <h3 className="font-medium text-lg">Connect Instagram</h3>
              <p className="mt-1 text-muted-foreground text-sm">
                Link your Instagram Business account to receive direct messages
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-4 border-t-[1px] pt-8">
            <Button className="w-full" onClick={handleConnect} variant="default">
              <ExternalLink className="mr-2 h-4 w-4" />
              Connect with Instagram
            </Button>
          </div>

          <div className="max-w-sm text-center text-muted-foreground text-xs">
            <ol className="mt-1 list-inside list-decimal space-y-1">
              <li>You'll be redirected to Facebook for authorization</li>
              <li>Select your Instagram Business account</li>
              <li>Grant permissions to receive direct messages</li>
              <li>Messages will appear in your inbox dashboard</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
