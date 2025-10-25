"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
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
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Disconnect {provider}?</SheetTitle>
          <SheetDescription>
            Disconnecting this channel will stop syncing messages. You can reconnect anytime.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2 py-6">
          <p className="text-muted-foreground text-sm">
            Existing conversations will remain in your inbox, but new messages won't be synced.
          </p>
        </div>

        <SheetFooter>
          <Button disabled={isLoading} onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button className="gap-2" disabled={isLoading} onClick={onConfirm} variant="destructive">
            {isLoading ? "Disconnecting…" : "Disconnect"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
