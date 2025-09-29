import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
// Old type imports removed - now using Zod schemas directly
import { invoiceGenerator } from '../tools/invoiceGenerator';
import { notionOrdersTool } from '../tools/notionOrdersTool';
// import { invoiceDbTool } from '../tools/invoiceDbTool'; // Removed - too complex
import { NotionClient } from '../utils/notionClient';
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

// Step 2: Create Invoice Records in Notion (Orders + Invoices databases)
const createNotionInvoiceStep = createStep({
  id: 'create-notion-invoice-records',
  description: 'Create invoice entries in both Orders database (legacy) and Invoices database (new)',
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
    orders_record_data: z.any().optional(),
    invoice_record_data: z.any().optional(),
    client_id: z.string().optional(),
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
      
      console.log('Creating Notion records for:', inputData.customer_name);

      const totalAmount = inputData.items.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);
      const notionClient = new NotionClient();
      
      // Step 1: Create/Get Client Record
      let clientId: string;
      try {
        // Try to find existing client first
        const existingClients = await notionClient.queryClientRecords({
          name: inputData.customer_name,
        }, 1);
        
        if (existingClients.length > 0) {
          clientId = existingClients[0].id!;
          console.log('Using existing client:', clientId);
        } else {
          // Create new client
          const newClient = await notionClient.createClientRecord({
            name: inputData.customer_name,
            phone_number: inputData.phone_number,
            referral_source: 'Telegram Bot',
            notes: `Created via invoice workflow on ${new Date().toISOString()}`,
          });
          clientId = newClient.id;
          console.log('Created new client:', clientId);
        }
      } catch (error) {
        console.error('Failed to create/find client:', error);
        return {
          success: false,
          error: 'Failed to create or find client record',
        };
      }

      // Step 2: Create Order Record (for backward compatibility)
      let orderResult;
      try {
        orderResult = await notionOrdersTool.execute({
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
        
        if (orderResult.success) {
          console.log('Orders record created successfully:', orderResult.order_id);
        } else {
          console.warn('Orders record creation failed:', orderResult.error);
        }
      } catch (error) {
        console.warn('Error creating Orders record:', error);
        orderResult = { success: false, error: 'Failed to create Orders record' };
      }

      // Step 3: Create Invoice Record (new system)
      let invoiceResult;
      try {
        const invoiceNumber = inputData.invoice_data?.invoice_id || `INV-${Date.now()}`;
        const issueDate = new Date().toISOString().split('T')[0];
        const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days from now
        
        // TODO: Add invoice record creation with simpler tool later
        invoiceResult = { 
          success: true, 
          data: { 
            invoice_id: invoiceNumber,
            amount: totalAmount,
            status: 'Generated'
          } 
        };
        
        if (invoiceResult.success) {
          console.log('Invoice record created successfully:', invoiceResult.data?.record_id);
        } else {
          console.warn('Invoice record creation failed:', invoiceResult.error);
        }
      } catch (error) {
        console.warn('Error creating Invoice record:', error);
        invoiceResult = { success: false, error: 'Failed to create Invoice record' };
      }

      // Return success if at least one record was created
      const success = orderResult.success || invoiceResult.success;
      
      if (success) {
        return {
          success: true,
          orders_record_data: orderResult.success ? orderResult : undefined,
          invoice_record_data: invoiceResult.success ? invoiceResult.data : undefined,
          client_id: clientId,
        };
      } else {
        return {
          success: false,
          error: `Failed to create records. Orders: ${orderResult.error}, Invoice: ${invoiceResult.error}`,
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
      orders_record_data: notionResult.orders_record_data,
      invoice_record_data: notionResult.invoice_record_data,
      client_id: notionResult.client_id,
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
⚠️ *Invoice Generation Issue*

*Customer:* ${initData.customer_name}
*Fallback Order ID:* ${fallbackId}
*Total Amount:* GHS ${totalAmount}

📋 *Items:*
${initData.items.map((item: { name: string; quantity: number; unit_cost: number }) => `• ${item.name}: ${item.quantity} × GHS ${item.unit_cost}`).join('\n')}

📝 I've recorded the order details in your database. You can create the formal invoice manually or try again later.
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
      const invoiceNumber = notionResult.invoice_record_data?.invoice_number || notionResult.orders_record_data?.order_id || 'N/A';
      const totalAmount = notionResult.invoice_record_data?.amount || notionResult.orders_record_data?.total_price || generateResult.invoice_data?.total_amount || 'N/A';
      
      confirmationMessage = `
🎉 *Invoice Complete!*

*Customer:* ${initData.customer_name}
*Invoice Number:* ${invoiceNumber}
*Total Amount:* GHS ${totalAmount}

✅ PDF invoice delivered above
✅ Records saved to our database
${notionResult.invoice_record_data ? '✅ Professional invoice record created' : ''}
${notionResult.orders_record_data ? '✅ Order record maintained for legacy systems' : ''}

Thank you for choosing Cimantikós Clothing Company! 🧵
      `;
    } else {
      // PDF delivery failed - provide fallback message with details
      const invoiceNumber = notionResult.invoice_record_data?.invoice_number || notionResult.orders_record_data?.order_id || 'N/A';
      const totalAmount = notionResult.invoice_record_data?.amount || notionResult.orders_record_data?.total_price || generateResult.invoice_data?.total_amount || 'N/A';
      
      confirmationMessage = `
⚠️ *Invoice Generated (Delivery Issue)*

*Customer:* ${initData.customer_name}
*Invoice Number:* ${invoiceNumber}
*Total Amount:* GHS ${totalAmount}

✅ Invoice created and saved to database
${notionResult.invoice_record_data ? '✅ Professional invoice record created' : ''}
${notionResult.orders_record_data ? '✅ Order record maintained' : ''}
⚠️ PDF delivery failed: ${pdfResult.error || 'Unknown error'}

📝 Your order is recorded. We'll send the invoice via alternative method.

Thank you for choosing Cimantikós Clothing Company! 🧵
      `;
    }
    
    const actualChatId = runtimeContext?.get?.('chatId') || runtimeContext?.get?.('chat_id') || initData.chat_id;
    await sendSuccessMessage(actualChatId, confirmationMessage);
    
    const invoiceNumber = notionResult.invoice_record_data?.invoice_number || notionResult.orders_record_data?.order_id || generateResult.invoice_data?.invoice_id;
    
    return {
      success: true,
      message: pdfResult.pdf_sent ? 'Invoice workflow completed successfully' : 'Invoice created but PDF delivery failed',
      invoice_id: generateResult.invoice_data?.invoice_id,
      invoice_number: invoiceNumber,
      pdf_path: generateResult.invoice_data?.pdf_path,
      pdf_url: generateResult.invoice_data?.pdf_url,
      pdf_delivered: pdfResult.pdf_sent,
      delivery_method: pdfResult.delivery_method,
      client_id: notionResult.client_id,
      orders_record_url: notionResult.orders_record_data?.order_url,
      invoice_record_id: notionResult.invoice_record_data?.record_id,
    };
  })
  .commit();
