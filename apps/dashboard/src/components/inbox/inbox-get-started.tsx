"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConnectChannelsModal } from "./connect-channels-modal";

export function InboxGetStarted() {
  const [open, setOpen] = useState(false);
  return (
    <div className="h-[calc(100vh-150px)] flex items-center justify-center px-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-2xl font-semibold mb-2">Connect Your Communication Channels</h1>
          <p className="text-sm text-muted-foreground">Connect WhatsApp, Instagram, and email to receive and manage customer messages in one place</p>
        </div>

        <div className="flex items-center justify-center">
          <Button onClick={() => setOpen(true)} className="px-6" size="sm">
            Connect channel
          </Button>
        </div>

        <ConnectChannelsModal open={open} onOpenChange={setOpen} />
      </div>
    </div>
  );
}
