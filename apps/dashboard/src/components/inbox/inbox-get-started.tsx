"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConnectChannelsModal } from "./connect-channels-modal";

export function InboxGetStarted() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-[calc(100vh-150px)] items-center justify-center px-6">
      <div className="w-full max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="mb-2 font-semibold text-2xl">Connect Your Communication Channels</h1>
          <p className="text-muted-foreground text-sm">
            Connect WhatsApp, Instagram, and email to receive and manage customer messages in one
            place
          </p>
        </div>

        <div className="flex items-center justify-center">
          <Button className="px-6" onClick={() => setOpen(true)} size="sm">
            Connect channel
          </Button>
        </div>

        <ConnectChannelsModal onOpenChange={setOpen} open={open} />
      </div>
    </div>
  );
}
