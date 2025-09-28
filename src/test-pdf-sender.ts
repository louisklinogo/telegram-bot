import 'dotenv/config';
import { validateEnvironmentVariables } from './config/validateEnv';
import { createTelegramBot } from './telegram/botHandler';
import { setBotInstance } from './mastra/tools/grammyHandler';
import { pdfSender } from './mastra/tools/pdfSender';
import * as fs from 'fs/promises';
import * as path from 'path';

async function testPdfSender() {
  console.log('🧪 Testing PDF Sender functionality...\n');

  try {
    // Validate environment variables
    const env = validateEnvironmentVariables();
    console.log('✅ Environment variables validated');

    // Create and initialize bot
    const bot = createTelegramBot(env.TELEGRAM_BOT_TOKEN);
    setBotInstance(bot);
    console.log('✅ Bot instance initialized');

    // Create a test PDF directory and file
    const testPdfDir = path.join(process.cwd(), 'test-pdfs');
    await fs.mkdir(testPdfDir, { recursive: true });
    console.log('✅ Test PDF directory created');

    // Create a simple test PDF (just a placeholder text file with .pdf extension for testing)
    const testPdfPath = path.join(testPdfDir, 'test-invoice.pdf');
    const testContent = 'This is a test PDF content for testing purposes.';
    await fs.writeFile(testPdfPath, testContent);
    console.log('✅ Test PDF file created:', testPdfPath);

    // Test the pdfSender tool with a test chat ID
    // Note: Replace this with your actual chat ID for testing
    const TEST_CHAT_ID = 123456789; // Replace with your Telegram chat ID
    
    console.log('🚀 Testing PDF sending...');
    
    const result = await pdfSender.execute?.({
      context: {
        pdf_path: testPdfPath,
        caption: '📄 *Test Invoice PDF*\n\n*Customer:* Test Customer\n*Invoice #:* TEST-001\n*Total Amount:* GHS 100.00\n\nThis is a test PDF delivery!',
      },
      runtimeContext: {
        chat_id: TEST_CHAT_ID,
      },
      suspend: async () => {},
    });

    if (result?.success) {
      console.log('✅ PDF sent successfully!');
      console.log('📊 Result:', result);
    } else {
      console.log('❌ PDF sending failed:');
      console.log('💥 Error:', result?.error);
    }

    // Clean up test file
    await fs.unlink(testPdfPath);
    console.log('🧹 Test PDF file cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('💥 Error details:', error.message);
      console.error('📍 Stack trace:', error.stack);
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testPdfSender()
    .then(() => {
      console.log('\n✨ Test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed with unhandled error:', error);
      process.exit(1);
    });
}

export { testPdfSender };