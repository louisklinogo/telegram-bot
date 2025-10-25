export type Platform = "whatsapp" | "instagram";

export type MessageStatus = "new" | "replied" | "pending" | "resolved";

export type MessageType = "text" | "image" | "video" | "document";

export type MessageSender = "customer" | "business";

export interface ConversationMessage {
  id: string;
  sender: MessageSender;
  content: string;
  timestamp: Date;
  type: MessageType;
  attachmentUrl?: string;
  deliveryStatus?: "sent" | "delivered" | "read";
}

export interface InboxMessage {
  id: string;
  platform: Platform;
  customerId?: string;
  customerName: string;
  customerAvatar?: string;
  phoneNumber?: string;
  instagramHandle?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  status: MessageStatus;
  // Server thread status (open/pending/resolved/snoozed)
  threadStatus?: "open" | "pending" | "resolved" | "snoozed";
  hasAttachment: boolean;
  messages: ConversationMessage[];
  // Optional lead info (server-enriched)
  leadId?: string | null;
  leadStatus?: "new" | "interested" | "qualified" | "converted" | "lost";
  leadScore?: number;
  leadQualification?: "hot" | "warm" | "cold";
}
