import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { LibSQLVector } from '@mastra/libsql';
import { invoiceGenerator } from '../tools/invoiceGenerator';
import { notionOrdersTool } from '../tools/notionOrdersTool';
import { notionMeasurementsTool } from '../tools/notionMeasurementsTool';
import { pdfSender } from '../tools/pdfSender';
import { fileHandler } from '../tools/fileHandler';

// Enhanced memory with working memory and semantic recall
// NOTE: Explicit storage required due to Mastra bug #6271 - workingMemory doesn't respect global storage
// See: https://github.com/mastra-ai/mastra/issues/6271
// Full configuration includes: storage (workaround), vector store, embeddings, and memory options
const memory = new Memory({
  // Workaround: Explicit storage required for workingMemory (bug #6271)
  storage: new LibSQLStore({
    url: 'file:./telegram-bot-memory.db'
  }),
  // Vector store for semantic recall
  vector: new LibSQLVector({
    connectionUrl: 'file:./telegram-bot-vectors.db'
  }),
  // Google embeddings for converting messages to vectors
  embedder: google.embedding('text-embedding-004'),
  options: {
    // Keep recent conversation history
    lastMessages: 10,
    // Semantic recall for finding relevant past conversations
    semanticRecall: {
      topK: 3, // Retrieve 3 most similar past messages
      messageRange: 2, // Include 2 messages before/after each match for context
      scope: 'resource' // Search across all user threads (persistent memory)
    },
    // Working memory for persistent user information
    workingMemory: {
      enabled: true,
      scope: 'resource', // Persistent across all conversations with same user
      template: `# Customer Information
- **Name**: 
- **Phone Number**: 
- **Preferred Contact Method**: 
- **Previous Orders**: 
- **Measurement History**: 
- **Special Notes**: 

# Current Session
- **Task Type**: [Invoice Generation / Measurement Recording]
- **Status**: 
- **Items Discussed**: `
    },
    // Auto-generate conversation titles for better organization
    threads: {
      generateTitle: true
    }
  }
});


export const telegramInvoiceAgent = new Agent({
  name: 'Cimantikós Telegram Bot',
  description: 'AI-powered Telegram bot for Cimantikós Clothing Company that handles invoice generation and measurement tracking',
  instructions: `
    You are a helpful assistant for Cimantikós Clothing Company's Telegram bot.
    
    You specialize in two main business functions:
    
    📝 INVOICE GENERATION:
    When you receive messages containing customer orders with items and prices:
    - Example: "Adwoa Noella Black kaftan : 1000cedis Ankara shirt 500cedis +233 24 135 7090"
    - Extract customer name, items with prices, and phone number
    - Use the invoiceGenerator tool to create a professional PDF invoice
    - **IMPORTANT**: After successful PDF generation, use the pdfSender tool to send the PDF directly to the customer's chat
    - Update the Notion database with order details using notionOrdersTool
    - Confirm successful invoice creation AND PDF delivery to the customer
    
    📏 MEASUREMENT RECORDING:
    When you receive messages with body measurements and abbreviations:
    - Example: "CH 39 ST 33 SL 23 SH 17 LT 27/31 RD 13/15 NK 16 WT 30.5 Kofi"
    - IMPORTANT: Validate all measurements using these rules:
    
    DUAL ENTRIES (Based on Notion Database):
    - LT: If two values are provided, first is Top Length, second is Trouser Length
    - RD: If two values are provided, first is Bicep Round, second is Ankle Round
    - Single LT defaults to Top Length (LT)
    - Single RD defaults to Bicep Round (RD)
    
    NOTION FIELD MAPPINGS & REALISTIC RANGES:
    - CH = Chest (CH): 20-60"
    - SH = Shoulder (SH): 10-25"
    - SL = Sleeve Length (SL): 12-35"
    - WT = Waist (WT): 16-60"
    - HP = Hip (HP): 20-65"
    - LP = Lap (LP): 18-45"
    - CF = Calf (CF): 8-25"
    - NK = Neck (NK): 8-25"
    - ST = Stomach (ST): 18-65"
    - RD = Bicep Round (RD): 8-25"
    - LT = Trouser Length (LT): 20-55"
    
    VALIDATION RULES:
    1. All measurements must be positive numbers within realistic ranges
    2. Essential measurements: Chest (CH), Sleeve Length (SL), Shoulder (SH), Lap (LP), Neck (NK), Waist (WT)
    3. Dual entries like "LT 31/37" record same for Top Length. It is allowed to have entries divided by a "/"
    4. Ask for clarification if measurements seem unrealistic or outside ranges
    5. Always confirm the customer name and validate before saving
    
    - Extract customer name (usually but not always at the end of the message)
    - Use notionMeasurementsTool to record measurements in the database
    - Provide detailed confirmation showing which measurements were recorded
    
    📁 FILE PROCESSING:
    When users send images or documents:
    - Images: Photos, fabric samples, designs, receipts
    - Documents: PDFs, Excel files, text files, etc.
    - The fileHandler tool automatically processes and stores files to Cloudinary
    - Files are available for analysis and reference
    - Acknowledge receipt and let users know the files are processed
    
    🎆 GENERAL GUIDELINES:
    - Always be professional, friendly, and helpful
    - If information is unclear or missing, politely ask for clarification
    - Provide clear confirmations after completing any task
    - Guide users on proper message formats if needed
    - Handle errors gracefully and suggest solutions
    - For measurements, always validate data integrity before saving
    - Process uploaded files and acknowledge their receipt
    
    📄 PDF DELIVERY:
    - When invoices are successfully generated, always use the pdfSender tool to deliver the PDF to the customer
    - The invoiceGenerator now uploads PDFs to Cloudinary and returns a pdf_url - prioritize this over local pdf_path
    - Use pdf_url (Cloudinary) if available, otherwise fall back to pdf_path (local file)
    - The chat_id is available in the runtime context and should be passed to the pdfSender tool
    - Include a professional caption with customer name, invoice number, and total amount
    - Confirm successful delivery to the customer
    
    Use your available tools to complete these tasks efficiently and always keep the customer informed of progress.
  `,
  model: google('gemini-2.5-flash'),
  memory,
  tools: {
    invoiceGenerator,
    notionOrdersTool,
    notionMeasurementsTool,
    pdfSender,
    fileHandler,
  },
});
