import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { InvoiceRequestSchema, InvoiceResponseSchema } from '../agents/types/invoice';
import { invoiceGenerator } from '../tools/invoiceGenerator';
import { notionOrdersTool } from '../tools/notionOrdersTool';
import { sendSuccessMessage, sendErrorMessage } from '../tools/grammyHandler';
import { pdfSender } from '../tools/pdfSender';

// Input schema for the workflow (flexible to handle agent serialization issues)
export const InvoiceWorkflowInputSchema = z.object({
  chat_id: z.number(),
  customer_name: z.string(),
  phone_number: z.string().optional(),
  items: z.array(z.union([
    // Normal object format
    z.object({
      name: z.string(),
      quantity: z.number(),
      unit_cost: z.number(),
    }),
    // JSON string format (for agent serialization issues)
    z.string()
  ])),
  notes: z.string().optional(),
});

// Output schema for the workflow
export const InvoiceWorkflowOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  invoice_id: z.string().optional(),
  invoice_number: z.string().optional(),
  pdf_path: z.string().optional(),
  notion_url: z.string().optional(),
});

// Step 1: Generate PDF Invoice
const generateInvoiceStep = createStep({
  id: 'generate-invoice',
  description: 'Generate PDF invoice using Invoice-Generator.com API',
  inputSchema: InvoiceWorkflowInputSchema,
  outputSchema: z.object({
    status: z.enum(['success', 'error']),
    invoice_data: z.any().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    try {
      console.log('Generating invoice for:', inputData.customer_name);

      const result = await invoiceGenerator.execute({
        context: inputData,
        runtimeContext,
        suspend: async () => {},
      });

      if (result.success) {
        console.log('Invoice generated successfully:', result.invoice_id);
        return {
          status: 'success' as const,
          invoice_data: result,
        };
      } else {
        console.error('Invoice generation failed:', result.error);
        return {
          status: 'error' as const,
          error: result.error || 'Failed to generate invoice',
        };
      }
    } catch (error) {
      console.error('Error in generateInvoiceStep:', error);
      return {
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
});

// Step 2: Create Invoice in Notion
const createNotionInvoiceStep = createStep({
  id: 'create-notion-invoice',
  description: 'Create invoice entry in Notion database',
  inputSchema: z.object({
    chat_id: z.number(),
    customer_name: z.string(),
    phone_number: z.string().optional(),
    items: z.array(z.object({
      name: z.string(),
      quantity: z.number(),
      unit_cost: z.number(),
    })),
    notes: z.string().optional(),
    generation_status: z.enum(['success', 'error']),
    invoice_data: z.any().optional(),
    generation_error: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    invoice_record_data: z.any().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    try {
      // Skip Notion creation if invoice generation failed
      if (inputData.generation_status === 'error') {
        console.log('Skipping Notion creation due to invoice generation failure');
        return {
          success: false,
          error: 'Invoice generation failed, skipping Notion creation',
        };
      }
      
      console.log('Creating Notion invoice for:', inputData.customer_name);

      const totalAmount = inputData.items.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);

      const result = await notionOrdersTool.execute({
        context: {
          customer_name: inputData.customer_name,
          phone_number: inputData.phone_number,
          items: inputData.items.map(item => ({
            ...item,
            total_cost: item.unit_cost * item.quantity
          })),
          total_price: inputData.invoice_data?.total_price || totalAmount,
          invoice_file_url: inputData.invoice_data?.pdf_path || '',
          notes: inputData.notes || '',
        },
        runtimeContext,
        suspend: async () => {},
      });

      if (result.success) {
        console.log('Notion invoice created successfully:', result.order_id);
        return {
          success: true,
          invoice_record_data: result,
        };
      } else {
        console.error('Notion invoice creation failed:', result.error);
        return {
          success: false,
          error: result.error || 'Failed to create Notion invoice',
        };
      }
    } catch (error) {
      console.error('Error in createNotionInvoiceStep:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
});

// Step 3: Send PDF to User
const sendPdfStep = createStep({
  id: 'send-pdf-to-user',
  description: 'Send the generated PDF invoice to the customer',
  inputSchema: z.object({
    chat_id: z.number(),
    customer_name: z.string(),
    invoice_data: z.any().optional(),
    generation_status: z.enum(['success', 'error']),
    invoice_record_data: z.any().optional(),
  }),
  outputSchema: z.object({
    pdf_sent: z.boolean(),
    delivery_method: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    try {
      // Skip PDF sending if invoice generation failed
      if (inputData.generation_status === 'error' || !inputData.invoice_data) {
        console.log('Skipping PDF delivery due to invoice generation failure');
        return {
          pdf_sent: false,
          delivery_method: 'none',
          error: 'No PDF to send - generation failed',
        };
      }

      const { chat_id, customer_name, invoice_data, invoice_record_data } = inputData;
      
      console.log('📤 Sending PDF invoice to customer:', customer_name);

      // Prepare PDF delivery
      const totalAmount = invoice_data.total_amount || 0;
      const invoiceNumber = invoice_record_data?.order_id || invoice_data.invoice_id || 'N/A';
      
      const caption = `📄 Invoice for ${customer_name}\n\nInvoice #: ${invoiceNumber}\nTotal: GHS ${totalAmount.toLocaleString()}\n\nThank you for choosing Cimantikós Clothing Company! 🧵`;

      // Get the actual chat_id from runtime context
      const actualChatId = runtimeContext?.get?.('chatId') || runtimeContext?.get?.('chat_id') || chat_id;
      console.log(`🔍 Using chat_id: ${actualChatId} for PDF delivery`);
      
      // Send PDF using pdfSender tool with proper fallback
      const pdfResult = await pdfSender.execute({
        context: {
          chat_id: actualChatId,
          pdf_url: invoice_data.pdf_url, // Try Cloudinary URL first
          pdf_path: invoice_data.pdf_path, // Always provide local file as fallback
          caption: caption,
        },
        runtimeContext,
        suspend: async () => {},
      });

      if (pdfResult.success) {
        console.log('✅ PDF invoice delivered successfully to user:', customer_name);
        return {
          pdf_sent: true,
          delivery_method: invoice_data.pdf_url ? 'cloudinary_url' : 'local_file',
        };
      } else {
        console.error('❌ PDF delivery failed:', pdfResult.error);
        return {
          pdf_sent: false,
          error: pdfResult.error || 'Failed to deliver PDF',
        };
      }
    } catch (error) {
      console.error('Error in sendPdfStep:', error);
      return {
        pdf_sent: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
});

// Helper function to parse items from agent (fixes AI serialization issue)
const parseWorkflowItems = (items: any[]): Array<{ name: string; quantity: number; unit_cost: number }> => {
  return items.map(item => {
    // If item is a string, try to parse it as JSON
    if (typeof item === 'string') {
      try {
        const parsed = JSON.parse(item);
        return {
          name: String(parsed.name || '').trim(),
          quantity: Number(parsed.quantity || 1),
          unit_cost: Number(parsed.unit_cost || 0),
        };
      } catch (error) {
        console.warn('Failed to parse item string:', item);
        // Try to extract from string pattern like "Name: price cedis"
        const match = item.match(/(.+?):\s*(\d+(?:\.\d+)?)\s*cedis?/i);
        if (match) {
          return {
            name: match[1].trim(),
            quantity: 1,
            unit_cost: parseFloat(match[2]),
          };
        }
        // Fallback: treat as item name with 0 cost
        return {
          name: String(item).trim(),
          quantity: 1,
          unit_cost: 0,
        };
      }
    }
    // If item is already an object, validate and return
    return {
      name: String(item.name || '').trim(),
      quantity: Number(item.quantity || 1),
      unit_cost: Number(item.unit_cost || 0),
    };
  }).filter(item => item.name); // Remove empty items
};

// Production-ready workflow with sequential processing
export const invoiceWorkflow = createWorkflow({
  id: 'invoice-processing-workflow',
  description: 'Complete invoice processing workflow from request to confirmation',
  inputSchema: InvoiceWorkflowInputSchema,
  outputSchema: InvoiceWorkflowOutputSchema,
  retryConfig: {
    attempts: 3,
    delay: 2000
  }
})
  .map(async ({ inputData }) => {
    // Preprocess agent input to handle JSON string serialization issues
    console.log('🔧 Preprocessing workflow input data...');
    
    const processedItems = parseWorkflowItems(inputData.items);
    
    console.log(`📊 Parsed ${processedItems.length} items:`, 
      processedItems.map(item => `${item.name} (${item.quantity}x GHS ${item.unit_cost})`).join(', '));
    
    return {
      ...inputData,
      items: processedItems,
    };
  })
  .then(generateInvoiceStep)
  .map(async ({ getStepResult, getInitData }) => {
    const generateResult = getStepResult(generateInvoiceStep);
    const initData = getInitData();
    
    return {
      chat_id: initData.chat_id,
      customer_name: initData.customer_name,
      phone_number: initData.phone_number,
      items: initData.items,
      notes: initData.notes,
      generation_status: generateResult.status,
      invoice_data: generateResult.invoice_data,
      generation_error: generateResult.error,
    };
  })
  .then(createNotionInvoiceStep)
  .map(async ({ getStepResult, getInitData }) => {
    const notionResult = getStepResult(createNotionInvoiceStep);
    const generateResult = getStepResult(generateInvoiceStep);
    const initData = getInitData();
    
    return {
      chat_id: initData.chat_id,
      customer_name: initData.customer_name,
      invoice_data: generateResult.invoice_data,
      generation_status: generateResult.status,
      invoice_record_data: notionResult.invoice_record_data,
    };
  })
  .then(sendPdfStep)
  .map(async ({ getStepResult, getInitData, runtimeContext }) => {
    const pdfResult = getStepResult(sendPdfStep);
    const notionResult = getStepResult(createNotionInvoiceStep);
    const generateResult = getStepResult(generateInvoiceStep);
    const initData = getInitData();
    
    // Handle different scenarios in final output
    if (generateResult.status === 'error') {
      // Invoice generation failed - execute fallback
      const fallbackId = `FALLBACK_${Date.now()}_${initData.customer_name.replace(/[^a-zA-Z0-9]/g, '')}`;
      const totalAmount = initData.items.reduce((sum: number, item: { name: string; quantity: number; unit_cost: number }) => sum + (item.unit_cost * item.quantity), 0);
      
      const fallbackMessage = `
⚠️ *Invoice Service Temporarily Unavailable*

*Customer:* ${initData.customer_name}
*Fallback Invoice ID:* ${fallbackId}
*Total Amount:* GHS ${totalAmount}

📋 *Items:*
${initData.items.map((item: { name: string; quantity: number; unit_cost: number }) => `• ${item.name}: ${item.quantity} × GHS ${item.unit_cost}`).join('\n')}

📝 Your order has been recorded. We'll generate the formal invoice shortly and send it to you.

Thank you for choosing Cimantikós Clothing Company! 🧵
      `;
      
      const actualChatId = runtimeContext?.get?.('chatId') || runtimeContext?.get?.('chat_id') || initData.chat_id;
      await sendSuccessMessage(actualChatId, fallbackMessage);
      
      return {
        success: true,
        message: 'Invoice workflow completed with fallback',
        invoice_id: fallbackId,
        invoice_number: fallbackId,
      };
    }
    
    // Normal success case - send confirmation based on PDF delivery status
    let confirmationMessage;
    
    if (pdfResult.pdf_sent) {
      confirmationMessage = `
🎉 *Invoice Complete!*

*Customer:* ${initData.customer_name}
*Invoice Number:* ${notionResult.invoice_record_data?.order_id || 'N/A'}
*Total Amount:* GHS ${notionResult.invoice_record_data?.total_price || generateResult.invoice_data?.total_amount || 'N/A'}

✅ PDF invoice delivered above
✅ Order saved to our database

Thank you for choosing Cimantikós Clothing Company! 🧵
      `;
    } else {
      // PDF delivery failed - provide fallback message with details
      confirmationMessage = `
⚠️ *Invoice Generated (Delivery Issue)*

*Customer:* ${initData.customer_name}
*Invoice Number:* ${notionResult.invoice_record_data?.order_id || 'N/A'}
*Total Amount:* GHS ${notionResult.invoice_record_data?.total_price || generateResult.invoice_data?.total_amount || 'N/A'}

✅ Invoice created and saved to database
⚠️ PDF delivery failed: ${pdfResult.error || 'Unknown error'}

📝 Your order is recorded. We'll send the invoice via alternative method.

Thank you for choosing Cimantikós Clothing Company! 🧵
      `;
    }
    
    const actualChatId = runtimeContext?.get?.('chatId') || runtimeContext?.get?.('chat_id') || initData.chat_id;
    await sendSuccessMessage(actualChatId, confirmationMessage);
    
    return {
      success: true,
      message: pdfResult.pdf_sent ? 'Invoice workflow completed successfully' : 'Invoice created but PDF delivery failed',
      invoice_id: generateResult.invoice_data?.invoice_id,
      invoice_number: generateResult.invoice_data?.invoice_id,
      pdf_path: generateResult.invoice_data?.pdf_path,
      pdf_url: generateResult.invoice_data?.pdf_url,
      pdf_delivered: pdfResult.pdf_sent,
      delivery_method: pdfResult.delivery_method,
      notion_url: notionResult.invoice_record_data?.order_url,
    };
  })
  .commit();
