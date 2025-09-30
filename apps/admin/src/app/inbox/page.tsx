"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox as InboxIcon, Plus } from "lucide-react";

export default function InboxPage() {
  return (
    <div className="flex flex-col gap-6 px-6">
      {/* Header */}
      <div className="flex justify-between py-6">
        <div />
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> New Message
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <InboxIcon className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Inbox Feature</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              The inbox will centralize all your communications including client messages,
              system notifications, and important updates in one place.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
