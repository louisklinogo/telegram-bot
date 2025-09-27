# Cimantikós Clothing Company Telegram Bot

A modern Telegram bot powered by Mastra AI and Gemini 2.5 Pro for generating professional invoices and recording customer measurements for Cimantikós Clothing Company.

## 🚀 Features

- **📄 Invoice Generation**: Create professional PDF invoices from text messages
- **📏 Measurement Recording**: Record and store customer measurements in Notion
- **🤖 AI-Powered**: Uses Gemini 2.5 Pro for intelligent message processing
- **📊 Notion Integration**: Automatically updates Notion databases
- **🔧 Modern Architecture**: Built with Mastra, Grammy, and TypeScript

## 📋 Prerequisites

- Node.js 20 or higher
- Telegram Bot Token
- Google Gemini API Key
- Notion API Key and Database IDs
- Invoice-Generator.com API Key

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd invoice/telegram-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your credentials:
   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   GOOGLE_API_KEY=your_google_api_key
   NOTION_API_KEY=your_notion_api_key
   INVOICE_GENERATOR_API_KEY=your_invoice_generator_api_key
   NOTION_CLIENTS_DB_ID=242d63b0-1370-8068-b932-c47d1f9801d3
   NOTION_INVOICES_DB_ID=254d63b0-1370-8044-b07f-000bc1bbb94d
   NOTION_ORDERS_DB_ID=242d63b0-1370-80f7-89b4-e58193b9e7c7
   NOTION_MEASUREMENTS_DB_ID=242d63b0-1370-80ef-a2ff-d923121c40c5
   PORT=8080
   WEBHOOK_URL=https://your-project-name-uc.a.run.app/webhook
   ```

## 🏃‍♂️ Development

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Build the application**
   ```bash
   npm run build
   ```

3. **Start the production server**
   ```bash
   npm start
   ```

## 🤖 Usage

### Invoice Generation

Send a message with customer name, items, and prices:

```
Adwoa Noella
Black kaftan : 1000cedis
Ankara shirt 500cedis
+233 24 135 7090
```

### Measurement Recording

Send a message with measurements and customer name:

```
CH 39
ST 33
SL 23
SH 17
LT 27
RB 13
NK 16
WT 30.5
39.5
LB 22
RD 14
Kofi
```

### Available Commands

- `/start` - Welcome message and bot introduction
- `/help` - Show help and usage instructions
- `/invoice` - Start invoice creation flow
- `/measurements` - Start measurement recording flow
- `/cancel` - Cancel current operation

## 📊 Architecture

```
telegram-bot/
├── src/
│   └── mastra/
│       ├── agents/
│       │   ├── telegramInvoiceAgent.ts    # Main AI agent with Gemini 2.5 Pro
│       │   └── types/                      # TypeScript type definitions
│       ├── tools/
│       │   ├── grammyHandler.ts            # Telegram message handler
│       │   ├── invoiceGenerator.ts         # PDF invoice generation
│       │   ├── notionInvoicesTool.ts        # Notion invoices database operations
│       │   ├── notionOrdersTool.ts         # Notion orders database operations
│       │   └── notionMeasurementsTool.ts   # Notion measurements database operations
│       ├── workflows/
│       │   ├── invoiceWorkflow.ts          # Invoice processing workflow
│       │   └── measurementWorkflow.ts      # Measurement processing workflow
│       ├── bot/
│       │   └── grammyBot.ts                # Grammy bot implementation
│       ├── index.ts                        # Mastra configuration
│       └── server.ts                       # HTTP server with webhook
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

## 🌐 Deployment

### Google Cloud Run

1. **Build and tag the Docker image**
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT-ID/cimantikos-bot
   ```

2. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy cimantikos-bot \
     --image gcr.io/PROJECT-ID/cimantikos-bot \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars \
        "TELEGRAM_BOT_TOKEN=your_token", \
        "GOOGLE_API_KEY=your_key", \
        "NOTION_API_KEY=your_key", \
        "WEBHOOK_URL=https://your-service-uc.a.run.app/webhook"
   ```

3. **Set up Telegram webhook**
   ```bash
   curl -X POST https://your-service-uc.a.run.app/set-webhook \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-service-uc.a.run.app/webhook"}'
   ```

### Local Development with Webhook

For local testing, you can use ngrok to expose your local server:

1. **Start ngrok**
   ```bash
   ngrok http 8080
   ```

2. **Set webhook to ngrok URL**
   ```bash
   curl -X POST https://your-service-uc.a.run.app/set-webhook \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-ngrok-url.ngrok.io/webhook"}'
   ```

## 🔧 API Endpoints

- `GET /health` - Health check endpoint
- `POST /webhook` - Telegram webhook handler
- `POST /set-webhook` - Set Telegram webhook
- `POST /remove-webhook` - Remove Telegram webhook
- `GET /webhook-info` - Get webhook information
- `POST /send-message` - Send manual message (for testing)

## 📝 Notion Database Setup

The bot integrates with the following Notion databases:

### CRM - Clients
- Database ID: `242d63b0-1370-8068-b932-c47d1f9801d3`
- Stores customer information and contact details

### Invoices
- Database ID: `254d63b0-1370-8044-b07f-000bc1bbb94d`
- Stores invoice information, customer details, and payment status

### Orders
- Database ID: `242d63b0-1370-80f7-89b4-e58193b9e7c7`
- Stores order information, items, and invoice links

### Measurements Vault
- Database ID: `242d63b0-1370-80ef-a2ff-d923121c40c5`
- Stores customer measurements for custom clothing

## 🚨 Error Handling

The bot includes comprehensive error handling:

- **Validation Errors**: Invalid input formats are detected and helpful error messages are provided
- **API Errors**: Failed API calls are logged and users are notified
- **Network Errors**: Retry logic and fallback messages for connection issues
- **Notion Errors**: Database operation failures are handled gracefully

## 🧪 Testing

To test the bot functionality:

1. **Manual Testing**
   - Send test messages to the bot
   - Verify invoice generation and PDF creation
   - Check Notion database entries

2. **API Testing**
   ```bash
   # Health check
   curl http://localhost:8080/health

   # Send test message
   curl -X POST http://localhost:8080/send-message \
     -H "Content-Type: application/json" \
     -d '{"chat_id": YOUR_CHAT_ID, "text": "Test message"}'
   ```

## 📊 Monitoring

- **Health Checks**: Server health endpoint at `/health`
- **Logs**: Comprehensive logging for debugging
- **Error Tracking**: Error logging and notification
- **Performance**: Response time monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Create an issue on GitHub
- Check the logs for error details
- Verify environment variables and API keys
- Test API endpoints individually

## 🎉 Acknowledgments

- [Mastra](https://mastra.ai/) - AI agent framework
- [Grammy](https://grammy.dev/) - Telegram bot framework
- [Google Gemini](https://ai.google.dev/) - AI model
- [Notion API](https://developers.notion.com/) - Database integration
- [Invoice-Generator.com](https://invoice-generator.com/) - PDF invoice generation