import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { InvoiceItem, InvoiceRequest, InvoiceResponse } from '../agents/types/invoice';
import { InvoiceResponseSchema } from '../agents/types/invoice';
import { uploadToCloudinary } from '../../config/cloudinary';
import fetch from 'node-fetch';
import { Agent as HttpAgent } from 'https';

// Create a persistent HTTP agent with connection pooling
const httpAgent = new HttpAgent({
  keepAlive: true,
  maxSockets: 10,
  maxFreeSockets: 5,
  timeout: 30000,
});

export const invoiceGenerator = createTool({
  id: 'invoice-generator',
  description: 'Generate PDF invoices using Invoice-Generator.com API',
  inputSchema: z.object({
    customer_name: z.string().describe('Customer name'),
    phone_number: z.string().optional().describe('Customer phone number'),
    items: z.array(z.object({
      name: z.string(),
      quantity: z.number(),
      unit_cost: z.number(),
    })).describe('Invoice items'),
    notes: z.string().optional().describe('Additional notes'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    invoice_id: z.string().optional(),
    pdf_path: z.string().optional(),
    pdf_url: z.string().optional(),
    cloudinary_public_id: z.string().optional(),
    customer_name: z.string().optional(),
    total_amount: z.number().optional(),
    items: z.array(z.object({
      name: z.string(),
      quantity: z.number(),
      unit_cost: z.number(),
      total_cost: z.number(),
    })).optional(),
    generated_at: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }, options) => {
    const { customer_name, phone_number, items, notes } = context;

    try {
      // Validate required fields
      if (!customer_name || !items || items.length === 0) {
        throw new Error('Customer name and at least one item are required');
      }

      // Get API key from environment
      const apiKey = process.env.INVOICE_GENERATOR_API_KEY;
      if (!apiKey) {
        throw new Error('Invoice generator API key not configured');
      }

      // Format customer address with phone number
      const customerAddress = phone_number
        ? `${customer_name}\n${phone_number}`
        : customer_name;

      // Calculate total amount for internal tracking only
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);

      // Prepare invoice data exactly like the working Python script
      const invoiceData = {
        from: 'Cimantikós Clothing Company\nWestlands Boulevard Rd,190\n+233208467699',
        to: customerAddress,
        logo: 'https://res.cloudinary.com/dk4b0brc0/image/upload/v1754602556/Logo-6_ykuaue.jpg',
        currency: 'GHS',
        date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        // Items without total_cost - API calculates automatically
        items: items.map(item => ({
          name: item.name.charAt(0).toUpperCase() + item.name.slice(1), // Title case like Python script
          quantity: item.quantity,
          unit_cost: item.unit_cost,
        })),
        terms: 'Customers are required to make full payment before work commences.\n\nPayment options are as stated below:\n\nMTN MOMO: 0558413199\nCimantikos Clothing Company (Edward Osei-Agyeman)\n\nCAL Bank account no: 1400009095472\nBranch: Madina',
        notes: notes || '',
      };

      // Make API call to Invoice-Generator.com with retry logic
      let response;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          response = await fetch('https://invoice-generator.com', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(invoiceData),
            signal: AbortSignal.timeout(30000), // 30 second timeout
          });

          if (response.ok) break;

          retryCount++;
          if (retryCount < maxRetries) {
            // Exponential backoff
            const delay = Math.pow(2, retryCount) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw new Error(`Network error after ${maxRetries} retries: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (!response?.ok) {
        const errorText = await response?.text() || 'Unknown error';
        throw new Error(`Invoice generation failed: ${response?.status || 'Unknown'} - ${errorText}`);
      }

      // Get PDF buffer
      const pdfBuffer = await response?.buffer();

      // Generate filename
      const sanitizedCustomerName = customer_name
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `invoice_${sanitizedCustomerName}_${timestamp}.pdf`;

      // Save PDF to local directory (async operations)
      const fs = await import('fs/promises');
      const path = await import('path');

      const pdfDir = path.join(process.cwd(), 'invoice-pdfs');

      // Create directory if it doesn't exist (async)
      try {
        await fs.access(pdfDir);
      } catch {
        // Directory doesn't exist, create it
        await fs.mkdir(pdfDir, { recursive: true });
      }

      const filePath = path.join(pdfDir, filename);
      
      // Write file asynchronously
      try {
        await fs.writeFile(filePath, pdfBuffer);
      } catch (fileError) {
        throw new Error(`Failed to save invoice PDF: ${fileError instanceof Error ? fileError.message : 'Unknown file error'}`);
      }

      console.log(`Invoice generated: ${filePath}`);
      
      // Upload to Cloudinary
      let cloudinaryResult;
      try {
        console.log('📤 Uploading PDF to Cloudinary...');
        cloudinaryResult = await uploadToCloudinary(filePath, {
          folder: 'cimantikos-invoices',
          public_id: `invoice_${sanitizedCustomerName}_${timestamp}`,
          resource_type: 'raw', // For PDF files
        });
        console.log(`✅ PDF uploaded to Cloudinary: ${cloudinaryResult.secure_url}`);
      } catch (uploadError) {
        console.error('⚠️ Cloudinary upload failed, but PDF was generated locally:', uploadError);
        // Continue without failing - local PDF is still available
      }
      
      // Clean up local file after successful upload
      if (cloudinaryResult) {
        try {
          await fs.unlink(filePath);
          console.log('🧹 Local PDF file cleaned up after Cloudinary upload');
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup local PDF file:', cleanupError);
          // Non-critical error, continue
        }
      }

      // Return success response
      const result = {
        success: true,
        invoice_id: filename,
        pdf_path: cloudinaryResult ? undefined : filePath, // Only include local path if Cloudinary failed
        pdf_url: cloudinaryResult?.secure_url,
        cloudinary_public_id: cloudinaryResult?.public_id,
        customer_name,
        total_amount: totalAmount,
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          total_cost: item.quantity * item.unit_cost, // Calculate for return value only
        })),
        generated_at: new Date().toISOString(),
      };

      // Validate result against output schema
      const outputSchema = z.object({
        success: z.boolean(),
        invoice_id: z.string().optional(),
        pdf_path: z.string().optional(),
        pdf_url: z.string().optional(),
        cloudinary_public_id: z.string().optional(),
        customer_name: z.string().optional(),
        total_amount: z.number().optional(),
        items: z.array(z.object({
          name: z.string(),
          quantity: z.number(),
          unit_cost: z.number(),
          total_cost: z.number(),
        })).optional(),
        generated_at: z.string().optional(),
        error: z.string().optional(),
      });

      const validationResult = outputSchema.safeParse(result);
      if (!validationResult.success) {
        console.error('Tool result validation failed:', validationResult.error);
        throw new Error('Internal tool validation error');
      }

      return result;

    } catch (error) {
      console.error('Error generating invoice:', error);

      // Return error response that matches output schema
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };

      // Validate error result
      const errorValidation = InvoiceResponseSchema.safeParse(errorResult);
      if (!errorValidation.success) {
        console.error('Error result validation failed:', errorValidation.error);
        throw new Error('Internal error validation error');
      }

      return errorResult;
    }
  },
});

// Helper function to parse invoice text messages
export const parseInvoiceText = (text: string): Partial<InvoiceRequest> => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);

  const result: Partial<InvoiceRequest> = {
    items: [],
  };

  let currentLine = 0;

  // Extract customer name (usually first line)
  if (lines.length > 0) {
    const firstLine = lines[currentLine];
    // Skip if it's a phone number
    if (!firstLine.includes('+') && !firstLine.match(/^\d+$/)) {
      result.customer_name = firstLine;
      currentLine++;
    }
  }

  // Process remaining lines
  for (let i = currentLine; i < lines.length; i++) {
    const line = lines[i];

    // Check for phone number
    if (line.includes('+') || line.match(/[\d\s\-\(\)]+$/)) {
      result.phone_number = line.replace(/[^\d+]/g, '');
      continue;
    }

    // Parse item lines
    const itemPatterns = [
      /(.+?)\s*:\s*(\d+(?:\.\d+)?)\s*cedis?/i,  // "Item : price cedis"
      /(.+?)\s+(\d+(?:\.\d+)?)\s*cedis?/i,     // "Item price cedis"
      /(.+?)\s*-\s*(\d+(?:\.\d+)?)\s*cedis?/i,  // "Item - price cedis"
    ];

    for (const pattern of itemPatterns) {
      const match = line.match(pattern);
      if (match) {
        const itemName = match[1].trim();
        const price = parseFloat(match[2]);

        if (!result.items) result.items = [];
        result.items.push({
          name: itemName,
          quantity: 1,
          unit_cost: price,
          // Note: Don't include total_cost here - API calculates it automatically
        });
        break;
      }
    }
  }

  return result;
};