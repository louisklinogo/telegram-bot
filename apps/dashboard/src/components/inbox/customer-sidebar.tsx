"use client";

import { format } from "date-fns";
import { ChevronRight, Mail, MessageSquare, Phone, ShoppingBag, User, X } from "lucide-react";
import { WhatsappLogo, InstagramLogo } from "phosphor-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={cn(
        "w-[320px] border-l bg-background flex flex-col transition-all duration-200",
        "md:relative md:translate-x-0",
        "fixed right-0 top-0 bottom-0 z-50",
        isOpen ? "translate-x-0" : "translate-x-full md:hidden"
      )}
    >
      {/* Mobile close button */}
      <div className="flex items-center justify-between p-4 border-b md:hidden">
        <h3 className="font-semibold">Customer Info</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Customer Profile */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={message.customerAvatar} />
                <AvatarFallback>{getInitials(message.customerName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{message.customerName}</h3>
                <div className="flex items-center gap-1 mt-1">
                  {message.platform === "whatsapp" ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 text-xs">
                      <WhatsappLogo size={12} weight="duotone" />
                      WhatsApp
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border-purple-200 gap-1 text-xs"
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
                <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                  <a href={`/clients/${message.customerId}`}>
                    <ChevronRight className="h-4 w-4 mr-2" />
                    View customer profile
                  </a>
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Conversation Metadata */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Conversation Details</h4>
            
            {/* Status */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={status} onValueChange={setStatus}>
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
              <label className="text-xs text-muted-foreground">Assigned to</label>
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
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Last message:</span>
                <span>{format(message.lastMessageTime, "MMM d, h:mm a")}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Lead */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Lead</h4>
            {message.leadId ? (
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="gap-1">
                  {message.leadStatus?.toUpperCase()}
                </Badge>
                {typeof message.leadScore === "number" && (
                  <Badge variant="outline" className={cn(
                    message.leadQualification === "hot" && "bg-red-50 text-red-700 border-red-200",
                    message.leadQualification === "warm" && "bg-orange-50 text-orange-700 border-orange-200",
                    message.leadQualification === "cold" && "bg-blue-50 text-blue-700 border-blue-200",
                  )}>
                    {message.leadQualification?.toUpperCase()} ({message.leadScore})
                  </Badge>
                )}
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => createLead.mutate({ threadId: message.id })}
                disabled={createLead.isPending}
              >
                Add as Lead
              </Button>
            )}
          </div>

          <Separator />

          {/* Customer History */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Customer History</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Conversations</span>
                </div>
                <span className="text-sm font-medium">3</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Orders</span>
                </div>
                <span className="text-sm font-medium">5</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Internal Notes */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Internal Notes</h4>
            <p className="text-xs text-muted-foreground">
              Notes are only visible to your team
            </p>
            <Textarea
              placeholder="Add a note..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <Button size="sm" className="w-full" disabled={!noteText.trim()}>
              Add Note
            </Button>

            {/* Example notes */}
            <div className="space-y-2 mt-4">
              <div className="p-3 rounded-md bg-muted/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">John Doe</span>
                  <span className="text-xs text-muted-foreground">2h ago</span>
                </div>
                <p className="text-xs text-muted-foreground">
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