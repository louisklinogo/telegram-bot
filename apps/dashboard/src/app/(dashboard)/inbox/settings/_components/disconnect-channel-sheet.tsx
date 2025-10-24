"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

interface DisconnectChannelSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: string;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

export function DisconnectChannelSheet({
  open,
  onOpenChange,
  provider,
  onConfirm,
  isLoading,
}: DisconnectChannelSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Disconnect {provider}?</SheetTitle>
          <SheetDescription>
            Disconnecting this channel will stop syncing messages. You can reconnect anytime.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-2">
          <p className="text-sm text-muted-foreground">
            Existing conversations will remain in your inbox, but new messages won't be synced.
          </p>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? "Disconnecting…" : "Disconnect"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
