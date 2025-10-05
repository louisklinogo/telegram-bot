"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@cimantikos/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

interface ChannelDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: {
    id: string;
    name: string;
    logo: React.ComponentType;
    category: string;
    description: string;
    installed: boolean;
    active: boolean;
  };
  onInstall: () => void;
  onDisconnect: () => void;
}

export function ChannelDetailsSheet({
  open,
  onOpenChange,
  channel,
  onInstall,
  onDisconnect,
}: ChannelDetailsSheetProps) {
  const Logo = channel.logo;
  const [settings, setSettings] = useState({
    notifications: true,
    autoReply: false,
    readReceipts: true,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center space-x-2">
              <Logo />
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg leading-none">{channel.name}</h3>
                  {channel.installed && (
                    <div className="bg-green-600 text-[9px] dark:bg-green-300 rounded-full size-1" />
                  )}
                </div>
                <span className="text-xs text-[#878787]">{channel.category} • By Cimantikós</span>
              </div>
            </div>

            <div>
              {channel.installed ? (
                <Button variant="outline" onClick={onDisconnect}>
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="border-primary"
                  onClick={onInstall}
                  disabled={!channel.active}
                >
                  Install
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <ScrollArea className="h-[calc(100vh-200px)] pt-2" hideScrollbar>
              <Accordion type="multiple" defaultValue={["description"]} className="mt-4">
                <AccordionItem value="description" className="border-none">
                  <AccordionTrigger>How it works</AccordionTrigger>
                  <AccordionContent className="text-[#878787] text-sm">
                    {channel.description}
                    {channel.id === "whatsapp" && (
                      <div className="mt-4 space-y-2">
                        <p>This integration allows you to:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Receive customer messages and photos</li>
                          <li>Get measurement requests from clients</li>
                          <li>Send automated replies and confirmations</li>
                          <li>Track conversation history</li>
                        </ul>
                      </div>
                    )}
                    {channel.id === "instagram" && (
                      <div className="mt-4 space-y-2">
                        <p>This integration allows you to:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Receive Instagram Direct Messages</li>
                          <li>Connect with fashion-conscious customers</li>
                          <li>Share portfolio and designs</li>
                          <li>Manage customer inquiries</li>
                        </ul>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {channel.installed && (
                  <AccordionItem value="settings" className="border-none">
                    <AccordionTrigger>Settings</AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="notifications">Message Notifications</Label>
                          <p className="text-xs text-[#878787]">
                            Get notified when you receive new messages
                          </p>
                        </div>
                        <Switch
                          id="notifications"
                          checked={settings.notifications}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, notifications: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="autoReply">Auto-Reply</Label>
                          <p className="text-xs text-[#878787]">
                            Send automatic replies when unavailable
                          </p>
                        </div>
                        <Switch
                          id="autoReply"
                          checked={settings.autoReply}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, autoReply: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="readReceipts">Read Receipts</Label>
                          <p className="text-xs text-[#878787]">
                            Let customers know when you've read their messages
                          </p>
                        </div>
                        <Switch
                          id="readReceipts"
                          checked={settings.readReceipts}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, readReceipts: checked })
                          }
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </ScrollArea>

            <div className="absolute bottom-4 pt-8 border-t border-border">
              <p className="text-[10px] text-[#878787]">
                Cimantikós integrates with trusted communication platforms to help you manage
                customer conversations efficiently. We maintain high security standards and never
                share your data with third parties.
              </p>
            </div>
          </div>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
