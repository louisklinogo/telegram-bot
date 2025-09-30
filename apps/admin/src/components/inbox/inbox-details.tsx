import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { InboxMessage } from "@/types/inbox";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Image as ImageIcon, Paperclip, Send, Smile } from "lucide-react";

interface InboxDetailsProps {
  message: InboxMessage | null;
}

export function InboxDetails({ message }: InboxDetailsProps) {
  if (!message) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Select a conversation to view details</p>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 border-b p-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={message.customerAvatar} />
          <AvatarFallback>{getInitials(message.customerName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{message.customerName}</h3>
            {message.platform === "whatsapp" ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                WhatsApp
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border-purple-200">
                Instagram
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {message.phoneNumber || message.instagramHandle}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {message.messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.sender === "customer" ? "justify-start" : "justify-end"
              )}
            >
              <div
                className={cn(
                  "max-w-[70%] rounded-lg px-4 py-2",
                  msg.sender === "customer"
                    ? "bg-muted"
                    : "bg-primary text-primary-foreground"
                )}
              >
                {msg.type === "image" && msg.attachmentUrl && (
                  <div className="mb-2">
                    <img
                      src={msg.attachmentUrl}
                      alt="Attachment"
                      className="rounded max-w-full h-auto"
                    />
                  </div>
                )}
                <p className="text-sm">{msg.content}</p>
                <div className="mt-1 flex items-center gap-1 text-xs opacity-70">
                  <span>{format(msg.timestamp, "HH:mm")}</span>
                  {msg.sender === "business" && msg.deliveryStatus && (
                    <span>
                      {msg.deliveryStatus === "read" && "✓✓"}
                      {msg.deliveryStatus === "delivered" && "✓"}
                      {msg.deliveryStatus === "sent" && "✓"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input Footer */}
      <TooltipProvider>
        <div className="border-t p-4">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" disabled>
                  <Smile className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Coming soon: Emoji picker</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" disabled>
                  <Paperclip className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Coming soon: Attach files</p>
              </TooltipContent>
            </Tooltip>

            <Input
              placeholder="Type a message..."
              className="flex-1"
              disabled
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button disabled>
                  <Send className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Coming soon: Send messages</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="mt-2 text-xs text-center text-muted-foreground">
            Backend integration coming soon
          </p>
        </div>
      </TooltipProvider>
    </div>
  );
}
