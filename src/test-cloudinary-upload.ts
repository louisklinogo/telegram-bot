import 'dotenv/config';
import { validateEnvironmentVariables } from './config/validateEnv';
import { configureCloudinary, uploadToCloudinary } from './config/cloudinary';
import * as fs from 'fs/promises';
import * as path from 'path';

async function testCloudinaryUpload() {
  console.log('🧪 Testing Cloudinary Upload functionality...\n');

  try {
    // Validate environment variables
    const env = validateEnvironmentVariables();
    console.log('✅ Environment variables validated');

    // Configure Cloudinary
    configureCloudinary();
    console.log('✅ Cloudinary configured');

    // Create a test PDF
    const testDir = path.join(process.cwd(), 'test-uploads');
    await fs.mkdir(testDir, { recursive: true });
    
    const testPdfPath = path.join(testDir, 'test-cloudinary-upload.pdf');
    const testContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n174\n%%EOF';
    
    await fs.writeFile(testPdfPath, testContent);
    console.log('✅ Test PDF created:', testPdfPath);

    // Test Cloudinary upload
    console.log('🚀 Uploading to Cloudinary...');
    
    const result = await uploadToCloudinary(testPdfPath, {
      folder: 'cimantikos-test',
      public_id: `test-upload-${Date.now()}`,
      resource_type: 'raw'
    });

    if (result) {
      console.log('✅ Cloudinary upload successful!');
      console.log('📊 Upload result:');
      console.log(`   Public ID: ${result.public_id}`);
      console.log(`   Secure URL: ${result.secure_url}`);
      console.log(`   Format: ${result.format}`);
      console.log(`   Resource Type: ${result.resource_type}`);
      console.log(`   Bytes: ${result.bytes}`);
    } else {
      console.log('❌ Cloudinary upload failed: No result returned');
    }

    // Clean up test file
    await fs.unlink(testPdfPath);
    await fs.rmdir(testDir, { recursive: true });
    console.log('🧹 Test files cleaned up');

  } catch (error) {
    console.error('❌ Cloudinary test failed:', error);
    if (error instanceof Error) {
      console.error('💥 Error details:', error.message);
      console.error('📍 Stack trace:', error.stack);
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testCloudinaryUpload()
    .then(() => {
      console.log('\n✨ Cloudinary test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Cloudinary test failed with unhandled error:', error);
      process.exit(1);
    });
}

export { testCloudinaryUpload };