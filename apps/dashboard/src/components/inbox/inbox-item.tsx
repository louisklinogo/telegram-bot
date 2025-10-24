import { formatDistanceToNow } from "date-fns";
import { Image } from "lucide-react";
import { WhatsappLogo, InstagramLogo } from "phosphor-react";
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
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
        <WhatsappLogo size={14} weight="duotone" />
        WhatsApp
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border-purple-200 gap-1"
    >
      <InstagramLogo size={14} weight="duotone" />
      Instagram
    </Badge>
  );
}

function getLeadBadge(message: InboxMessage) {
  if (!message.leadId || !message.leadQualification) return null;
  const base = "text-xs gap-1";
  if (message.leadQualification === "hot") {
    return (
      <Badge variant="outline" className={cn(base, "bg-red-50 text-red-700 border-red-200")}> 
        HOT {typeof message.leadScore === 'number' ? `(${message.leadScore})` : null}
      </Badge>
    );
  }
  if (message.leadQualification === "warm") {
    return (
      <Badge variant="outline" className={cn(base, "bg-orange-50 text-orange-700 border-orange-200")}>
        WARM {typeof message.leadScore === 'number' ? `(${message.leadScore})` : null}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn(base, "bg-blue-50 text-blue-700 border-blue-200")}>
      COLD {typeof message.leadScore === 'number' ? `(${message.leadScore})` : null}
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
    <Badge variant="outline" className={cn("text-xs capitalize", map[threadStatus])}>
      {threadStatus}
    </Badge>
  );
}

export function InboxItem({ message, isSelected, onClick }: InboxItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col w-full items-start gap-2 rounded-lg p-3 text-left text-sm transition-all hover:bg-accent/50",
        isSelected && "bg-accent border border-border shadow-sm",
      )}
    >
      {/* Header Row */}
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="font-semibold truncate">{message.customerName}</div>
          {message.unreadCount > 0 && (
            <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
              {message.unreadCount}
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDistanceToNow(message.lastMessageTime, { addSuffix: true })}
        </div>
      </div>

      {/* Message Preview Row */}
      <div className="flex w-full items-start gap-2">
        <div className="flex-1 text-xs text-muted-foreground truncate min-w-0">
          {message.hasAttachment && <Image className="inline h-3 w-3 mr-1" />}
          {message.lastMessage || "No messages yet"}
        </div>
      </div>

      {/* Footer Row */}
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
          {message.phoneNumber && (
            <span className="truncate">{message.phoneNumber}</span>
          )}
          {message.instagramHandle && (
            <span className="truncate">{message.instagramHandle}</span>
          )}
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
