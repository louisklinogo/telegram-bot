import 'dotenv/config';
import { validateEnvironmentVariables } from './config/validateEnv';
import { configureCloudinary } from './config/cloudinary';
import { createTelegramBot } from './telegram/botHandler';
import { setBotInstance } from './mastra/tools/grammyHandler';
import { mastra } from './mastra/index';

async function testEndToEndInvoiceWithPDF() {
  console.log('🧪 Testing End-to-End Invoice Generation with PDF Delivery...\n');

  try {
    // Validate environment variables
    const env = validateEnvironmentVariables();
    console.log('✅ Environment variables validated');
    
    // Configure Cloudinary
    configureCloudinary();
    console.log('✅ Cloudinary configured');

    // Create and initialize bot
    const bot = createTelegramBot(env.TELEGRAM_BOT_TOKEN);
    setBotInstance(bot);
    console.log('✅ Bot instance initialized for PDF sending');

    // Get the Telegram invoice agent from Mastra
    const agent = mastra.getAgent('telegramInvoiceAgent');
    console.log('✅ Telegram invoice agent loaded');

    // Simulate a realistic invoice request message
    const invoiceMessage = `Kofi Mensah
Black kaftan : 150cedis
Ankara shirt : 80cedis
+233 24 123 4567`;

    const TEST_USER_ID = 123456;
    const TEST_CHAT_ID = 789012; // Replace with your actual chat ID for testing
    const TEST_USERNAME = 'test_user';

    console.log('📝 Processing invoice message:');
    console.log(invoiceMessage);
    console.log('');

    console.log('🚀 Generating response with agent...');

    // Generate response using agent with memory context
    const response = await agent.generateVNext(invoiceMessage, {
      memory: {
        resource: `user_${TEST_USER_ID}`,
        thread: { id: `chat_${TEST_CHAT_ID}` }
      },
      // Pass chat_id in runtime context for tools to access
      runtimeContext: {
        chat_id: TEST_CHAT_ID,
        user_id: TEST_USER_ID,
        username: TEST_USERNAME
      },
      maxSteps: 10 // Allow multiple tool calls for invoice generation and PDF sending
    });

    console.log('✅ Agent response generated!');
    console.log('📊 Response:', response.text);
    console.log('🔧 Steps taken:', response.steps?.length || 0);
    console.log('🏁 Finish reason:', response.finishReason);

    if (response.steps && response.steps.length > 0) {
      console.log('\n📋 Step details:');
      response.steps.forEach((step, index) => {
        console.log(`  ${index + 1}. ${step.type}: ${step.toolName || 'N/A'}`);
        if (step.result) {
          console.log(`     Result: ${typeof step.result === 'object' ? JSON.stringify(step.result, null, 2) : step.result}`);
        }
      });
    }

    console.log('\n✨ End-to-End test completed successfully!');

  } catch (error) {
    console.error('❌ End-to-End test failed:', error);
    if (error instanceof Error) {
      console.error('💥 Error details:', error.message);
      console.error('📍 Stack trace:', error.stack);
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEndToEndInvoiceWithPDF()
    .then(() => {
      console.log('\n🎉 E2E Test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 E2E Test failed with unhandled error:', error);
      process.exit(1);
    });
}

export { testEndToEndInvoiceWithPDF };