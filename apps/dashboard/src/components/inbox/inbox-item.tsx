import { formatDistanceToNow } from "date-fns";
import { Image } from "lucide-react";
import { InstagramLogo, WhatsappLogo } from "phosphor-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InboxMessage } from "@/types/inbox";

interface InboxItemProps {
  message: InboxMessage;
  isSelected: boolean;
  onClick: () => void;
}

function getPlatformBadge(platform: "whatsapp" | "instagram") {
  if (platform === "whatsapp") {
    return (
      <Badge className="gap-1 border-green-200 bg-green-50 text-green-700" variant="outline">
        <WhatsappLogo size={14} weight="duotone" />
        WhatsApp
      </Badge>
    );
  }

  return (
    <Badge
      className="gap-1 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700"
      variant="outline"
    >
      <InstagramLogo size={14} weight="duotone" />
      Instagram
    </Badge>
  );
}

function getLeadBadge(message: InboxMessage) {
  if (!(message.leadId && message.leadQualification)) return null;
  const base = "text-xs gap-1";
  if (message.leadQualification === "hot") {
    return (
      <Badge className={cn(base, "border-red-200 bg-red-50 text-red-700")} variant="outline">
        HOT {typeof message.leadScore === "number" ? `(${message.leadScore})` : null}
      </Badge>
    );
  }
  if (message.leadQualification === "warm") {
    return (
      <Badge
        className={cn(base, "border-orange-200 bg-orange-50 text-orange-700")}
        variant="outline"
      >
        WARM {typeof message.leadScore === "number" ? `(${message.leadScore})` : null}
      </Badge>
    );
  }
  return (
    <Badge className={cn(base, "border-blue-200 bg-blue-50 text-blue-700")} variant="outline">
      COLD {typeof message.leadScore === "number" ? `(${message.leadScore})` : null}
    </Badge>
  );
}

function getStatusBadge(threadStatus?: "open" | "pending" | "resolved" | "snoozed") {
  if (!threadStatus) return null;
  const map: Record<string, string> = {
    open: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    resolved: "bg-slate-50 text-slate-700 border-slate-200",
    snoozed: "bg-violet-50 text-violet-700 border-violet-200",
  };
  return (
    <Badge className={cn("text-xs capitalize", map[threadStatus])} variant="outline">
      {threadStatus}
    </Badge>
  );
}

export function InboxItem({ message, isSelected, onClick }: InboxItemProps) {
  return (
    <button
      className={cn(
        "flex w-full flex-col items-start gap-2 rounded-lg p-3 text-left text-sm transition-all hover:bg-accent/50",
        isSelected && "border border-border bg-accent shadow-sm"
      )}
      onClick={onClick}
      type="button"
    >
      {/* Header Row */}
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="truncate font-semibold">{message.customerName}</div>
          {message.unreadCount > 0 && (
            <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 font-medium text-[10px] text-primary-foreground">
              {message.unreadCount}
            </div>
          )}
        </div>
        <div className="whitespace-nowrap text-muted-foreground text-xs">
          {formatDistanceToNow(message.lastMessageTime, { addSuffix: true })}
        </div>
      </div>

      {/* Message Preview Row */}
      <div className="flex w-full items-start gap-2">
        <div className="min-w-0 flex-1 truncate text-muted-foreground text-xs">
          {message.hasAttachment && <Image className="mr-1 inline h-3 w-3" />}
          {message.lastMessage || "No messages yet"}
        </div>
      </div>

      {/* Footer Row */}
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-2 truncate text-muted-foreground text-xs">
          {message.phoneNumber && <span className="truncate">{message.phoneNumber}</span>}
          {message.instagramHandle && <span className="truncate">{message.instagramHandle}</span>}
        </div>
        <div className="flex items-center gap-2">
          {getLeadBadge(message)}
          {getStatusBadge(message.threadStatus)}
          {getPlatformBadge(message.platform)}
        </div>
      </div>
    </button>
  );
}
