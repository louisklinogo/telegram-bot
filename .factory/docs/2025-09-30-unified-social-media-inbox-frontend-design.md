# 📥 Unified Social Media Inbox - Frontend Components Spec

## 🎯 Overview
Design and build a unified communication inbox for Cimantikós that consolidates WhatsApp and Instagram messages into a single interface. Focus on **frontend components only** - no backend implementation yet.

---

## 📐 Design Pattern (Based on Midday)

### **Layout Structure:**
```
┌─────────────────────────────────────────────────────┐
│  Header (Search + Filters + Connect Button)        │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│  Message     │      Message Details Panel          │
│  List        │      (Selected conversation)        │
│  (Sidebar)   │                                      │
│              │                                      │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

---

## 🗂️ Components to Build

### **1. Empty State Components**

#### **`inbox-get-started.tsx`** - Initial empty state
```tsx
- Large icon (Messages/Inbox icon)
- Heading: "Connect Your Communication Channels"
- Description: "Connect WhatsApp and Instagram to receive and manage customer messages in one place"
- Two connection cards:
  ✓ WhatsApp Card
  ✓ Instagram Card
- Each card shows:
  - Platform icon
  - Platform name
  - Short description
  - "Connect" button
```

#### **`inbox-empty.tsx`** - No messages state
```tsx
- Displays when connected but no messages
- Icon + "No messages yet"
- Encouraging text about waiting for customer messages
```

---

### **2. Connection Components**

#### **`connect-whatsapp.tsx`**
```tsx
- Reuse from /whatsapp/components/connect-whatsapp.tsx
- Shows WhatsApp icon + "Connect WhatsApp" button
- Opens WhatsAppModal on click
```

#### **`connect-instagram.tsx`** (NEW)
```tsx
- Instagram icon + "Connect Instagram" button
- Opens InstagramModal on click
- Similar pattern to WhatsApp
```

#### **`whatsapp-modal.tsx`**
```tsx
- Reuse from /whatsapp/components/whatsapp-modal.tsx
- QR code generation
- Pre-filled message with inbox ID
- Copy link + Open WhatsApp buttons
- Instructions customized for tailoring:
  1. "Scan QR or click to open WhatsApp"
  2. "Send the pre-filled message to start"
  3. "Share measurement photos, design ideas, or questions"
  4. "Messages appear here for you to respond"
```

#### **`instagram-modal.tsx`** (NEW)
```tsx
- Similar to WhatsApp modal
- Instagram-specific OAuth flow explanation
- Shows:
  - Instagram business account requirements
  - Meta Business Suite connection steps
  - QR code or link to connect
  - Instructions for customers to DM the business
```

---

### **3. Main Inbox View Components**

#### **`inbox-view.tsx`** - Main container
```tsx
- Two-column layout
- Left: Message list (40% width)
- Right: Message details (60% width)
- Handles selection state
- Keyboard navigation (up/down arrows)
```

#### **`inbox-header.tsx`** - Top bar
```tsx
- Search bar (left)
- Filter dropdown (platform: all/whatsapp/instagram)
- Sort dropdown (newest/oldest)
- "+" button to manually add note/message
- Connected accounts indicator (badge showing 2/2 connected)
```

#### **`inbox-item.tsx`** - Message preview card
```tsx
- Platform icon (WhatsApp/Instagram badge)
- Customer name/phone
- Last message preview (1 line, truncated)
- Timestamp
- Unread indicator (dot/badge)
- Selected state (background highlight)
- Message type icon (text/image/video)
```

#### **`inbox-details.tsx`** - Right panel conversation view
```tsx
- Header:
  - Customer name
  - Platform badge
  - Last active time
  - Link to customer profile (if exists in CRM)
  
- Message thread:
  - Scrollable message list
  - Customer messages (left, gray bubble)
  - Your replies (right, blue bubble)
  - Timestamps
  - Image/attachment preview
  - Delivery status icons
  
- Footer:
  - Message input textarea
  - Emoji picker button
  - Attach image button
  - Send button
  - (Note: All disabled with "Coming Soon" tooltip)
```

---

### **4. Connected Accounts Management**

#### **`inbox-connected-accounts.tsx`**
```tsx
- Card showing connected platforms
- Each platform shows:
  - Icon + Platform name
  - Connection status (Connected/Disconnected)
  - Last sync time
  - "Disconnect" button
  - "Reconnect" if expired
  
- Example:
  ┌──────────────────────────────────────┐
  │ Connected Accounts                   │
  ├──────────────────────────────────────┤
  │ 📱 WhatsApp  ✓ Connected             │
  │    Last synced: 5 minutes ago        │
  │    [Disconnect]                      │
  ├──────────────────────────────────────┤
  │ 📷 Instagram ✓ Connected             │
  │    Last synced: 10 minutes ago       │
  │    [Disconnect]                      │
  └──────────────────────────────────────┘
```

---

### **5. Supporting Components**

#### **`inbox-search.tsx`**
```tsx
- Search input with magnifying glass icon
- Placeholder: "Search messages..."
- Real-time filtering (frontend only for now)
```

#### **`inbox-filter.tsx`** (NEW)
```tsx
- Dropdown with options:
  - All platforms
  - WhatsApp only
  - Instagram only
  - Unread only
  - With attachments
```

#### **`inbox-status.tsx`**
```tsx
- Badge component showing:
  - "New" - Unread message
  - "Replied" - You responded
  - "Pending" - Awaiting your reply
  - "Resolved" - Conversation closed
```

#### **`inbox-skeleton.tsx`**
```tsx
- Loading state for inbox list
- Shimmer effect on message cards
- Skeleton for details panel
```

---

## 🎨 Mock Data Structure

### **Message Interface:**
```typescript
interface InboxMessage {
  id: string;
  platform: 'whatsapp' | 'instagram';
  customerId?: string; // Link to client if exists
  customerName: string;
  customerAvatar?: string;
  phoneNumber?: string; // WhatsApp
  instagramHandle?: string; // Instagram
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  status: 'new' | 'replied' | 'pending' | 'resolved';
  hasAttachment: boolean;
  messages: ConversationMessage[];
}

interface ConversationMessage {
  id: string;
  sender: 'customer' | 'business';
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'video' | 'document';
  attachmentUrl?: string;
  deliveryStatus?: 'sent' | 'delivered' | 'read';
}
```

### **Sample Mock Data (3-5 conversations):**
```typescript
const mockInboxMessages: InboxMessage[] = [
  {
    id: '1',
    platform: 'whatsapp',
    customerName: 'John Doe',
    phoneNumber: '+1234567890',
    lastMessage: 'Hi, I want to order a custom suit',
    lastMessageTime: new Date('2025-01-30T10:30:00'),
    unreadCount: 2,
    status: 'new',
    hasAttachment: false,
    messages: [...]
  },
  {
    id: '2',
    platform: 'instagram',
    customerName: 'Jane Smith',
    instagramHandle: '@janesmith',
    lastMessage: 'Sent a photo',
    lastMessageTime: new Date('2025-01-30T09:15:00'),
    unreadCount: 0,
    status: 'replied',
    hasAttachment: true,
    messages: [...]
  },
  // 3 more examples...
];
```

---

## 📁 File Structure

```
apps/admin/src/
├── app/inbox/
│   ├── page.tsx                        # Main page
│   └── settings/
│       └── page.tsx                    # Settings page with connected accounts
│
├── components/inbox/
│   ├── inbox-get-started.tsx          # Empty state
│   ├── inbox-empty.tsx                # No messages state
│   ├── inbox-view.tsx                 # Main container
│   ├── inbox-header.tsx               # Top bar
│   ├── inbox-item.tsx                 # Message preview card
│   ├── inbox-details.tsx              # Conversation panel
│   ├── inbox-search.tsx               # Search component
│   ├── inbox-filter.tsx               # Filter dropdown
│   ├── inbox-status.tsx               # Status badges
│   ├── inbox-skeleton.tsx             # Loading states
│   ├── inbox-connected-accounts.tsx   # Accounts manager
│   ├── connect-whatsapp.tsx           # WhatsApp connection
│   ├── connect-instagram.tsx          # Instagram connection
│   ├── whatsapp-modal.tsx             # WhatsApp QR modal
│   ├── instagram-modal.tsx            # Instagram OAuth modal
│   └── index.tsx                      # Exports
│
├── lib/inbox/
│   └── mock-data.ts                   # Mock conversations
│
└── types/inbox.ts                     # TypeScript interfaces
```

---

## 🎨 Design Specifications

### **Colors & Styling:**
- WhatsApp badge: Green (#25D366)
- Instagram badge: Purple gradient (#E1306C → #C13584)
- Unread indicator: Blue dot
- Message bubbles: Customer (bg-muted), Business (bg-primary)

### **Icons Needed:**
- WhatsApp icon (from react-icons or custom)
- Instagram icon (from react-icons or custom)
- Message icon (inbox)
- Search icon
- Filter icon
- Attachment icon

### **Animations:**
- Message item hover: subtle scale
- New message: slide in from top
- Selection: smooth background transition
- Loading: skeleton shimmer

---

## 🚀 Implementation Steps

1. **Create empty states** (inbox-get-started, inbox-empty)
2. **Build connection modals** (WhatsApp + Instagram)
3. **Create mock data** (3-5 conversations with messages)
4. **Build message list** (inbox-view, inbox-item)
5. **Build details panel** (inbox-details with thread)
6. **Add header** (search, filters, actions)
7. **Add connected accounts** (settings page component)
8. **Polish animations** and responsive design

---

## ✅ Success Criteria

- [ ] Empty state displays with clear connection CTAs
- [ ] WhatsApp/Instagram modals open with instructions
- [ ] Mock messages display in list format
- [ ] Selecting message shows conversation details
- [ ] Platform badges clearly distinguish channels
- [ ] Search filters messages (frontend only)
- [ ] Responsive on mobile/tablet/desktop
- [ ] All interactions have disabled states with "Coming Soon" tooltips
- [ ] Connected accounts page shows connection status

---

## 📝 Notes

- **NO backend implementation** - all data is mocked
- Message sending is disabled with tooltip: "Backend integration coming soon"
- Focus on pixel-perfect UI matching Midday's quality
- Use exact Midday components (Button, Card, Badge, etc.)
- All interactions should feel smooth and professional
- Consider mobile experience for customer-facing QR codes