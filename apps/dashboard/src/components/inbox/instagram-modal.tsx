"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center space-y-6 p-8 pt-10">
          <div className="flex flex-col items-center space-y-4">
            <div className="scale-150">
              <InstagramLogo />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium">Connect Instagram</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Link your Instagram Business account to receive direct messages
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full border-t-[1px] pt-8">
            <Button onClick={handleConnect} className="w-full" variant="default">
              <ExternalLink className="mr-2 h-4 w-4" />
              Connect with Instagram
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center max-w-sm">
            <ol className="list-decimal list-inside space-y-1 mt-1">
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
