"use client";

import { format } from "date-fns";
import { ChevronRight, Mail, MessageSquare, Phone, ShoppingBag, User, X } from "lucide-react";
import { InstagramLogo, WhatsappLogo } from "phosphor-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { InboxMessage } from "@/types/inbox";

interface CustomerSidebarProps {
  message: InboxMessage | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CustomerSidebar({ message, isOpen, onClose }: CustomerSidebarProps) {
  const [status, setStatus] = useState<string>(message?.status || "new");
  const [noteText, setNoteText] = useState("");
  const utils = trpc.useUtils();
  const createLead = trpc.leads.createFromThread.useMutation({
    onSuccess: async () => {
      await utils.communications.threadsByStatus.invalidate();
    },
  });

  if (!message) return null;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div
      className={cn(
        "flex w-[320px] flex-col border-l bg-background transition-all duration-200",
        "md:relative md:translate-x-0",
        "fixed top-0 right-0 bottom-0 z-50",
        isOpen ? "translate-x-0" : "translate-x-full md:hidden"
      )}
    >
      {/* Mobile close button */}
      <div className="flex items-center justify-between border-b p-4 md:hidden">
        <h3 className="font-semibold">Customer Info</h3>
        <Button onClick={onClose} size="icon" variant="ghost">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          {/* Customer Profile */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={message.customerAvatar} />
                <AvatarFallback>{getInitials(message.customerName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{message.customerName}</h3>
                <div className="mt-1 flex items-center gap-1">
                  {message.platform === "whatsapp" ? (
                    <Badge
                      className="gap-1 border-green-200 bg-green-50 text-green-700 text-xs"
                      variant="outline"
                    >
                      <WhatsappLogo size={12} weight="duotone" />
                      WhatsApp
                    </Badge>
                  ) : (
                    <Badge
                      className="gap-1 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 text-xs"
                      variant="outline"
                    >
                      <InstagramLogo size={12} weight="duotone" />
                      Instagram
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2">
              {message.phoneNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{message.phoneNumber}</span>
                </div>
              )}
              {message.instagramHandle && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{message.instagramHandle}</span>
                </div>
              )}
              {message.customerId && (
                <Button asChild className="w-full justify-start" size="sm" variant="ghost">
                  <a href={`/clients/${message.customerId}`}>
                    <ChevronRight className="mr-2 h-4 w-4" />
                    View customer profile
                  </a>
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Conversation Metadata */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Conversation Details</h4>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs">Status</label>
              <Select onValueChange={setStatus} value={status}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignment */}
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs">Assigned to</label>
              <Select defaultValue="unassigned">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="me">Me</SelectItem>
                  <SelectItem value="team">Team Member</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timestamps */}
            <div className="space-y-1 text-muted-foreground text-xs">
              <div className="flex justify-between">
                <span>Last message:</span>
                <span>{format(message.lastMessageTime, "MMM d, h:mm a")}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Lead */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Lead</h4>
            {message.leadId ? (
              <div className="flex items-center gap-2 text-xs">
                <Badge className="gap-1" variant="outline">
                  {message.leadStatus?.toUpperCase()}
                </Badge>
                {typeof message.leadScore === "number" && (
                  <Badge
                    className={cn(
                      message.leadQualification === "hot" &&
                        "border-red-200 bg-red-50 text-red-700",
                      message.leadQualification === "warm" &&
                        "border-orange-200 bg-orange-50 text-orange-700",
                      message.leadQualification === "cold" &&
                        "border-blue-200 bg-blue-50 text-blue-700"
                    )}
                    variant="outline"
                  >
                    {message.leadQualification?.toUpperCase()} ({message.leadScore})
                  </Badge>
                )}
              </div>
            ) : (
              <Button
                disabled={createLead.isPending}
                onClick={() => createLead.mutate({ threadId: message.id })}
                size="sm"
                variant="outline"
              >
                Add as Lead
              </Button>
            )}
          </div>

          <Separator />

          {/* Customer History */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Customer History</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-md bg-muted/50 p-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Conversations</span>
                </div>
                <span className="font-medium text-sm">3</span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-muted/50 p-2">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Orders</span>
                </div>
                <span className="font-medium text-sm">5</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Internal Notes */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Internal Notes</h4>
            <p className="text-muted-foreground text-xs">Notes are only visible to your team</p>
            <Textarea
              className="min-h-[80px] resize-none"
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note..."
              value={noteText}
            />
            <Button className="w-full" disabled={!noteText.trim()} size="sm">
              Add Note
            </Button>

            {/* Example notes */}
            <div className="mt-4 space-y-2">
              <div className="space-y-1 rounded-md bg-muted/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs">John Doe</span>
                  <span className="text-muted-foreground text-xs">2h ago</span>
                </div>
                <p className="text-muted-foreground text-xs">
                  Customer requested expedited shipping
                </p>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
