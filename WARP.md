# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Cimantikós Clothing Company Telegram Bot** - A modern AI-powered Telegram bot built with Mastra AI framework and Gemini 2.5 Pro for generating professional invoices and recording customer measurements for a Ghana-based clothing company.

## Architecture

### Core Framework Stack
- **AI Framework**: [Mastra](https://mastra.ai/) - Modern AI agent framework with workflows and tools
- **Telegram Bot**: [Grammy](https://grammy.dev/) - Modern Telegram Bot API framework
- **AI Model**: Google Gemini 2.5 Pro via `@ai-sdk/google`
- **Database**: LibSQL for persistent storage and memory
- **Validation**: Zod schemas for type safety and input validation
- **Runtime**: Node.js 20+ with TypeScript

### Dual Server Architecture
The application runs **two separate servers**:

1. **Main Server (Port 8080)**: Handles Telegram webhooks, API endpoints, and bot interactions
2. **Mastra Server (Port 4111)**: AI agent processing, workflows, and playground interface

**Key Separation**: Grammy bot communicates with Mastra agents via HTTP API - no direct agent instantiation in bot handlers.

### Core Business Logic

**Two Primary Functions:**
1. **Invoice Generation**: Parses customer orders → Generates PDF invoices → Updates Notion database
2. **Measurement Recording**: Validates body measurements → Records in Notion → Supports dual entries for complex measurements

**Measurement System**: Advanced validation supporting dual entries:
- `LT 31/37` → Top Length=31, Trouser Length=37
- `RD 13/15` → Bicep Round=13, Ankle Round=15
- Realistic range validation (Chest: 20-70", Neck: 8-25", etc.)

## Development Commands

### Essential Development Commands
```bash
# Start both servers (development)
npm run dev              # Starts Mastra server (port 4111)
npm run dev:webhook      # Starts webhook server (port 8080)
npm run dev:both         # Starts both servers concurrently

# Production build & deployment
npm run build           # TypeScript compilation
npm start              # Production server (compiled JS)

# Type checking & auditing
npm run type-check     # TypeScript type checking without emit
npm audit              # Security audit
npm audit-fix          # Fix security issues
```

### Key Development URLs
- **Mastra Playground**: http://localhost:4111 (AI agent testing interface)
- **Main Server Health**: http://localhost:8080/health
- **Telegram Webhook**: http://localhost:8080/webhook
- **API Endpoint**: http://localhost:8080/api/telegram/process-message

## File Structure & Key Components

### Agent System (`src/mastra/`)
```
agents/
├── telegramInvoiceAgent.ts    # Main AI agent with Gemini 2.5 Pro
└── types/                     # TypeScript interfaces for invoice/measurement data

tools/
├── invoiceGenerator.ts        # PDF invoice creation via Invoice-Generator.com API
├── notionInvoicesTool.ts      # Notion invoices database operations  
├── notionOrdersTool.ts        # Notion orders database operations
├── notionMeasurementsTool.ts  # Notion measurements with validation
└── grammyHandler.ts           # Telegram response utilities

workflows/
├── invoiceWorkflow.ts         # Multi-step invoice processing
└── measurementWorkflow.ts     # Multi-step measurement recording
```

### Server & Integration (`src/`)
```
telegram/
├── botHandler.ts              # Grammy bot with clean API separation
└── schemas.ts                 # 400+ lines of security-focused validation

config/
└── validateEnv.ts             # Production environment validation

middleware/
└── rateLimit.ts               # Enterprise rate limiting & security

api/
└── telegramApi.ts             # HTTP API layer for Mastra communication

validation/
└── measurementValidation.ts   # Comprehensive measurement validation system
```

## Security & Production Features

### Environment Security
- **Comprehensive validation** with format checking (API keys, UUIDs, URLs)
- **Secret redaction** in logs: `7968***7279:***sy-5g`
- **Fail-fast startup** if required environment variables missing
- **Environment-specific configurations** (production/development)

### Input Validation & Security
- **XSS/injection prevention** with content sanitization
- **Control character removal** and protocol attack prevention
- **Message type detection** (invoice, measurement, command, general)
- **File upload validation** with MIME type and size limits

### Rate Limiting & Protection
- **Per-user limits**: 60 messages/min (Telegram), 100 requests/min (API)
- **Global limits**: 2000 messages/min (Telegram), 5000 requests/min (API) 
- **Escalating blocks**: 5 min → 10 min → extended for violations
- **Security event logging** with threat categorization

## Required Environment Variables

```env
# Core API Keys
TELEGRAM_BOT_TOKEN=1234567890:AAF...           # Bot token from @BotFather
GOOGLE_API_KEY=AIzaSy...                       # Gemini API key
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...         # Same as above (required by Mastra)
NOTION_API_KEY=ntn_...                         # Notion integration token
INVOICE_GENERATOR_API_KEY=sk_...               # Invoice-Generator.com API key

# Notion Database IDs (UUIDs)
NOTION_CLIENTS_DB_ID=242d63b0-1370-8068-b932-c47d1f9801d3
NOTION_INVOICES_DB_ID=254d63b0-1370-8044-b07f-000bc1bbb94d  
NOTION_ORDERS_DB_ID=242d63b0-1370-80f7-89b4-e58193b9e7c7
NOTION_MEASUREMENTS_DB_ID=242d63b0-1370-80ef-a2ff-d923121c40c5

# Server Configuration
PORT=8080                                      # Main server port
WEBHOOK_URL=https://your-domain.com/webhook    # Production webhook URL
```

## Data Models & Business Logic

### Invoice Processing Flow
1. **Parse message**: Extract customer name, items, prices, phone number
2. **Generate PDF**: Use Invoice-Generator.com API with retry logic
3. **Save to filesystem**: `invoice-pdfs/` directory with organized naming
4. **Update Notion**: Create records in both Orders and Invoices databases
5. **Confirm to user**: Send structured confirmation with details

### Measurement Processing Flow  
1. **Parse measurements**: Handle complex formats like `CH 39 ST 33 LT 27/31 RD 13/15 Kofi`
2. **Validate ranges**: Check against realistic human body measurements
3. **Handle dual entries**: Split LT→Top/Trouser Length, RD→Bicep/Ankle Round
4. **Save to Notion**: Create measurement record in Measurements Vault
5. **Provide feedback**: Detailed confirmation showing saved measurements

### Notion Database Integration
- **CRM - Clients**: Customer information and contact details
- **Invoices**: Invoice metadata, payment status, customer links
- **Orders**: Order items, pricing, invoice file links
- **Measurements Vault**: Body measurements with dual entry support

## Common Development Tasks

### Testing the Bot Locally
1. **Start development servers**: `npm run dev:both`
2. **Set up ngrok tunnel**: `ngrok http 8080`
3. **Configure webhook**: Use `/set-webhook` endpoint with ngrok URL
4. **Test in playground**: Access Mastra playground at localhost:4111
5. **Send test messages**: Use `/send-message` API endpoint

### Adding New Measurements
1. Update `src/validation/measurementValidation.ts` with new field mapping
2. Modify Notion schema definitions with realistic ranges
3. Update agent instructions in `telegramInvoiceAgent.ts`
4. Add field to `notionMeasurementsTool.ts` execution logic

### Debugging Agent Behavior
1. **Check Mastra playground**: Real-time agent interaction testing
2. **Review logs**: Both servers log to console with structured output
3. **Validate schemas**: Use type-check command for TypeScript errors
4. **Test workflows**: Individual workflow testing via playground

## Deployment

### Docker Production Deployment
```dockerfile
# Uses Node.js 20 Alpine with security hardening
# Non-root user execution for security
# Health checks and proper signal handling
# Build process: npm ci → mastra build → production start
```

### Google Cloud Run Deployment
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT-ID/cimantikos-bot
gcloud run deploy cimantikos-bot --image gcr.io/PROJECT-ID/cimantikos-bot

# Environment variables set via Cloud Run configuration
# Webhook automatically configured on deployment
```

## Important Notes

### Development Workflow
- **Phase-based refactoring**: Currently completed Phase 1 (Architecture) and Phase 2 (Security)
- **Quality gates**: Each phase has completion criteria before proceeding
- **Documentation**: CHANGELOG.md tracks detailed progress and achievements

### Common Pitfalls
- **Never instantiate agents directly in Grammy handlers** - use HTTP API layer
- **Always validate environment variables** at startup using `validateEnv.ts`
- **Use proper Mastra tool execution** in workflows - no manual tool calls
- **Handle dual measurement entries correctly** - single values have defaults

### Current State
- **Architecture**: Production-ready with proper separation of concerns
- **Security**: Enterprise-grade validation, rate limiting, and monitoring
- **Functionality**: Full invoice generation and measurement recording
- **Next phases**: Tool optimization, performance monitoring, comprehensive testing

## External Dependencies

### APIs
- **Telegram Bot API**: Bot token authentication, webhook configuration
- **Google Gemini 2.5 Pro**: AI model via AI SDK
- **Notion API**: Database operations for all business data
- **Invoice-Generator.com**: PDF invoice creation service

### Key Libraries
- **@mastra/core**: Agent framework, workflows, tools
- **grammy**: Telegram bot framework with clean API
- **@ai-sdk/google**: Gemini integration for Mastra
- **zod**: Runtime type validation and schema definition
- **@hono/node-server**: HTTP server framework for APIs

This comprehensive guide should enable any AI agent to quickly understand the codebase architecture, development workflows, and business logic to work effectively with this sophisticated Telegram bot system.