import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { LibSQLVector } from '@mastra/libsql';
import { invoiceGenerator } from '../tools/invoiceGenerator';
import { notionOrdersTool } from '../tools/notionOrdersTool';
import { notionMeasurementsTool } from '../tools/notionMeasurementsTool';
import { notionSearchTool } from '../tools/notionSearchTool';
import { pdfSender } from '../tools/pdfSender';
import { fileHandler } from '../tools/fileHandler';
import { invoiceWorkflow } from '../workflows/invoiceWorkflow';
import { measurementWorkflow } from '../workflows/measurementWorkflow';

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
    
    📝 COMPLETE INVOICE PROCESSING:
    For full invoice creation (customer orders with items and prices):
    - Example: "Adwoa Noella Black kaftan : 1000cedis Ankara shirt 500cedis +233 24 135 7090"
    - Extract customer name, items with prices, and phone number
    - **USE WORKFLOWS**: For complete invoice processing, use the invoiceWorkflow which handles:
      • PDF generation
      • Notion database updates
      • File delivery to customer
      • Error handling and fallbacks
    - This prevents timeouts and provides better user experience
    - The workflow will send progress updates and final confirmation to the user
    
    📏 COMPLETE MEASUREMENT PROCESSING:
    For full measurement recording (body measurements with customer name):
    - Example: "CH 39 ST 33 SL 23 SH 17 LT 27/31 RD 13/15 NK 16 WT 30.5 Kofi"
    - **USE WORKFLOWS**: For complete measurement processing, use the measurementWorkflow which handles:
      • Data validation and range checking
      • Notion database recording
      • Confirmation messaging
      • Error handling and user feedback
    
    MEASUREMENT VALIDATION RULES (for reference):
    - DUAL ENTRIES: LT supports dual entries like "31/37" (top length only)
    - FIELD MAPPINGS: CH=Chest, SH=Shoulder, SL=Sleeve, WT=Waist, HP=Hip, LP=Lap, CF=Calf, NK=Neck, ST=Stomach, RD=Bicep Round, LT=Top Length
    - RANGES: All measurements 8-65 inches (realistic human body measurements)
    - The workflow handles all validation automatically
    
    📁 FILE PROCESSING:
    When users send images or documents:
    - Images: Photos, fabric samples, designs, receipts
    - Documents: PDFs, Excel files, text files, etc.
    - The fileHandler tool automatically processes and stores files to Cloudinary
    - Files are available for analysis and reference
    - Acknowledge receipt and let users know the files are processed
    
    🔍 QUICK LOOKUPS & QUERIES:
    For simple data retrieval or searches:
    - Use notionSearchTool for finding existing customers, orders, or measurements
    - Use individual tools for quick operations that don't require multi-step processing
    - These provide immediate responses for simple queries
    
    📁 FILE PROCESSING:
    When users send images or documents:
    - Use fileHandler tool for immediate file processing and storage
    - Acknowledge receipt and inform users about successful processing
    - Files are stored to Cloudinary and available for reference
    
    🏠 DECISION LOGIC - WORKFLOWS vs TOOLS:
    
    **USE WORKFLOWS for:**
    ✓ Complete invoice creation (full customer order processing)
    ✓ Complete measurement recording (validation + storage + confirmation)
    ✓ Multi-step operations that typically take >10 seconds
    ✓ Operations that involve PDF generation, file uploads, or database writes
    
    **USE TOOLS for:**
    ✓ Quick searches and lookups ("find customer John")
    ✓ File uploads and processing
    ✓ Simple queries that need immediate responses
    ✓ Individual operations that don't require complex workflows
    
    🎦 GENERAL GUIDELINES:
    - Always be professional, friendly, and helpful
    - If information is unclear or missing, politely ask for clarification
    - Provide immediate responses for simple queries using tools
    - Use workflows for complex, time-intensive operations to prevent timeouts
    - Guide users on proper message formats if needed
    - Handle errors gracefully and suggest solutions
    
    Workflows provide better reliability and user experience for complex operations, while tools give immediate responses for simple tasks.
  `,
  model: google('gemini-flash-latest'),
  memory,
  workflows: {
    invoiceWorkflow,
    measurementWorkflow,
  },
  tools: {
    // Keep lightweight tools for quick operations
    notionSearchTool,
    fileHandler,
    // Keep fallback tools for error recovery
    invoiceGenerator,
    notionOrdersTool,
    notionMeasurementsTool,
    pdfSender,
  },
});
