"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@Faworra/ui/label";
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
                <span className="text-xs text-muted-foreground">{channel.category} • By Faworra</span>
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
                  Connect
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <ScrollArea className="h-[calc(100vh-200px)] pt-2" hideScrollbar>
              <Accordion type="multiple" defaultValue={["description"]} className="mt-4">
                <AccordionItem value="description" className="border-none">
                  <AccordionTrigger>How it works</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm">
                    {channel.description}

                    {channel.id === "whatsapp-baileys" && (
                      <div className="mt-4 space-y-2">
                        <p>
                          Connect by scanning a QR with the WhatsApp app on your phone. It’s the
                          fastest way to get started.
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Pair once and see messages in your inbox within minutes.</li>
                          <li>Works with your existing WhatsApp number.</li>
                          <li>Keep the phone powered and online for a steady connection; we’ll prompt if re‑pairing is needed.</li>
                        </ul>
                      </div>
                    )}

                    {channel.id === "whatsapp-cloud" && (
                      <div className="mt-4 space-y-2">
                        <p>
                          Connect your Meta Business account — no phone required. Designed for
                          reliable, higher‑volume messaging.
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Device‑free and stable for teams as you grow.</li>
                          <li>You control access via Meta Business/App credentials.</li>
                          <li>Some outbound messages may need approved templates — we guide you through it.</li>
                        </ul>
                      </div>
                    )}

                    {channel.id === "instagram" && (
                      <div className="mt-4 space-y-2">
                        <p>
                          Connect your Instagram Business account (linked to a Facebook Page) to
                          read and reply to DMs in Faworra.
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Handle DMs alongside WhatsApp and email in one place.</li>
                          <li>Supports text and media where Instagram allows.</li>
                          <li>We’ll remind you to refresh permissions when it’s time.</li>
                        </ul>
                      </div>
                    )}

                    {channel.id === "gmail" && (
                      <div className="mt-4 space-y-2">
                        <p>
                          Sign in with Google to bring customer emails into your inbox — great for
                          quotes, orders and support threads.
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Organize emails right beside chats for full context.</li>
                          <li>Attachments import when available.</li>
                          <li>Currently read‑only; sending from Faworra can be added later.</li>
                        </ul>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="notes" className="border-none">
                  <AccordionTrigger>Things to know</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm">
                    {channel.id === "whatsapp-baileys" && (
                      <div className="space-y-2">
                        <ul className="list-disc list-inside space-y-1">
                          <li>Keep the paired phone powered and online for a steady connection.</li>
                          <li>If the session pauses, we’ll prompt you to re‑scan the QR — it takes under a minute.</li>
                          <li>Perfect for getting started quickly; you can move to the Cloud API as you scale.</li>
                        </ul>
                      </div>
                    )}

                    {channel.id === "whatsapp-cloud" && (
                      <div className="space-y-2">
                        <ul className="list-disc list-inside space-y-1">
                          <li>Connect a Meta Business/App — no phone pairing required.</li>
                          <li>Some outbound messages may need approved templates; we’ll guide you.</li>
                          <li>Reply to new inbound chats within 24 hours to keep the conversation open.</li>
                        </ul>
                      </div>
                    )}

                    {channel.id === "instagram" && (
                      <div className="space-y-2">
                        <ul className="list-disc list-inside space-y-1">
                          <li>Requires an Instagram Business account linked to a Facebook Page.</li>
                          <li>Permissions expire from time to time — we’ll remind you to refresh.</li>
                          <li>Some reactions or content types may not sync due to API limits.</li>
                        </ul>
                      </div>
                    )}

                    {channel.id === "gmail" && (
                      <div className="space-y-2">
                        <ul className="list-disc list-inside space-y-1">
                          <li>You’ll see a Google consent screen — this is expected and safe.</li>
                          <li>Emails sync into your inbox for context; replies still send from Gmail (for now).</li>
                          <li>Workspace admins may need to allow access depending on policy.</li>
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
                          <p className="text-xs text-muted-foreground">
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
                          <p className="text-xs text-muted-foreground">
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
                          <p className="text-xs text-muted-foreground">
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
              <p className="text-[10px] text-muted-foreground">
                Faworra integrates with trusted communication platforms to help you manage
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
