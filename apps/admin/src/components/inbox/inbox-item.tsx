import { formatDistanceToNow } from "date-fns";
import { Image } from "lucide-react";
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
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        WhatsApp
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border-purple-200"
    >
      <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.5 2 2 6.5 2 12c0 5.5 4.5 10 10 10s10-4.5 10-10c0-5.5-4.5-10-10-10zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" />
        <circle cx="12" cy="12" r="3" />
        <circle cx="17" cy="7" r="1" />
      </svg>
      Instagram
    </Badge>
  );
}

export function InboxItem({ message, isSelected, onClick }: InboxItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col w-full items-start gap-2 border p-4 text-left text-sm transition-colors",
        isSelected ? "bg-accent border-[#DCDAD2] dark:border-[#2C2C2C]" : "hover:bg-accent/50",
      )}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="font-semibold">{message.customerName}</div>
          {message.unreadCount > 0 && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {message.unreadCount}
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDistanceToNow(message.lastMessageTime, { addSuffix: true })}
        </div>
      </div>

      <div className="flex w-full items-center justify-between">
        <div className="flex-1 text-xs text-muted-foreground truncate pr-2">
          {message.hasAttachment && <Image className="inline h-3 w-3 mr-1" />}
          {message.lastMessage}
        </div>
        {getPlatformBadge(message.platform)}
      </div>

      <div className="flex gap-2">
        {message.phoneNumber && (
          <span className="text-xs text-muted-foreground">{message.phoneNumber}</span>
        )}
        {message.instagramHandle && (
          <span className="text-xs text-muted-foreground">{message.instagramHandle}</span>
        )}
      </div>
    </button>
  );
}
