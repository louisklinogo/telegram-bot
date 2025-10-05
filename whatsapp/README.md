# WhatsApp Integration Reference

This directory contains reference code from Midday's WhatsApp integration feature.

## 📁 Structure

```
whatsapp/
├── webhook/
│   ├── whatsapp.ts       # Main webhook handler for Meta WhatsApp Business API
│   └── schemas.ts        # Zod schemas for webhook validation
└── components/
    ├── connect-whatsapp.tsx  # Button to initiate WhatsApp connection
    └── whatsapp-modal.tsx    # Modal with QR code and connection instructions
```

## 🔑 Key Features

### Webhook Handler (`webhook/whatsapp.ts`)
- **Webhook Verification**: Handles Meta's webhook verification challenge
- **Message Reception**: Receives incoming WhatsApp messages
- **Media Download**: Downloads attachments (images, PDFs, docs) from WhatsApp
- **Supabase Upload**: Uploads media to Supabase vault storage
- **Job Triggering**: Triggers background jobs for AI document processing

**Supported Media Types:**
- Images: JPEG, PNG, GIF, WebP
- Documents: PDF, DOC, DOCX, XLS, XLSX

### UI Components

**ConnectWhatsApp** (`components/connect-whatsapp.tsx`)
- Button component to open connection modal
- Requires user to have a team inbox ID

**WhatsAppModal** (`components/whatsapp-modal.tsx`)
- Generates QR code for easy mobile connection
- Pre-fills message with user's inbox ID
- Provides copy link and open WhatsApp buttons
- Shows step-by-step instructions

## 🔧 Environment Variables Required

```bash
# Meta WhatsApp Business API
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_ACCESS_TOKEN=your_access_token
NEXT_PUBLIC_WHATSAPP_NUMBER=1234567890
```

## 📊 Data Flow

```
Customer WhatsApp Message
         ↓
Meta WhatsApp Business API
         ↓
Webhook Handler (whatsapp.ts)
         ↓
Download Media from Meta
         ↓
Upload to Supabase Vault
         ↓
Trigger AI Processing Job
         ↓
Extract Document Data
         ↓
Show in Inbox Dashboard
```

## 🎯 Implementation for Cimantikós

### Potential Use Cases:

1. **Customer Measurement Photos**
   - Customers send body measurement photos via WhatsApp
   - Auto-upload to their order folder
   - Notification sent to admin

2. **Design Reference Images**
   - Customers share inspiration images
   - Automatically categorized and stored
   - Linked to their order

3. **Order Updates**
   - Customers send questions via WhatsApp
   - Photos of fitting issues
   - Direct communication channel

### Adaptation Required:

1. **Business Logic**
   - Replace document extraction with measurement photo handling
   - Link to orders instead of invoices
   - Custom notification system

2. **Database Schema**
   - Map to your existing orders/clients tables
   - Store WhatsApp phone numbers with client records
   - Track message history

3. **UI Customization**
   - Tailor instructions for tailoring business context
   - Custom branding in modal
   - Different workflow than invoice processing

## 🚀 Setup Steps (When Ready)

1. **Meta Business Setup**
   - Create Meta Business Account
   - Apply for WhatsApp Business API access
   - Get phone number and API credentials

2. **Webhook Configuration**
   - Deploy webhook endpoint (Next.js API route)
   - Configure Meta webhook URL
   - Set verification token

3. **Supabase Storage**
   - Create storage bucket for WhatsApp uploads
   - Configure RLS policies
   - Set up folder structure per client

4. **UI Integration**
   - Add components to admin dashboard
   - Generate unique inbox IDs per client
   - Implement QR code generation

## 📝 Notes

- This is **reference code only** - not production ready
- Requires significant adaptation for tailoring business
- Meta API has rate limits and costs
- Consider privacy/GDPR implications for customer photos

## 🔗 Resources

- [Meta WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp)
- [Midday Source](https://github.com/midday-ai/midday/tree/feature/whatsapp)
- Original implementation date: 2024 (feature branch)

---

**Status:** Reference implementation from Midday
**Last Updated:** September 30, 2025
