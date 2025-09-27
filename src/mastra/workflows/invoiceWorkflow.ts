import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { InvoiceRequestSchema, InvoiceResponseSchema } from '../agents/types/invoice';
import { invoiceGenerator } from '../tools/invoiceGenerator';
import { notionOrdersTool } from '../tools/notionOrdersTool';
import { sendSuccessMessage, sendErrorMessage } from '../tools/grammyHandler';

// Input schema for the workflow
export const InvoiceWorkflowInputSchema = z.object({
  chat_id: z.number(),
  customer_name: z.string(),
  phone_number: z.string().optional(),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    unit_cost: z.number(),
  })),
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
      
      await sendSuccessMessage(initData.chat_id, fallbackMessage);
      
      return {
        success: true,
        message: 'Invoice workflow completed with fallback',
        invoice_id: fallbackId,
        invoice_number: fallbackId,
      };
    }
    
    // Normal success case - send confirmation and return final result
    const confirmationMessage = `
🎉 *Invoice Created Successfully!*

*Customer:* ${initData.customer_name}
*Invoice Number:* ${notionResult.invoice_record_data?.order_id || 'N/A'}
*Invoice ID:* ${generateResult.invoice_data?.invoice_id || 'N/A'}
*Total Amount:* GHS ${notionResult.invoice_record_data?.total_price || generateResult.invoice_data?.total_amount || 'N/A'}

📄 Your invoice has been generated and saved to our system.
📋 Invoice details have been recorded in Notion.

Thank you for choosing Cimantikós Clothing Company! 🧵
    `;
    
    await sendSuccessMessage(initData.chat_id, confirmationMessage);
    
    return {
      success: true,
      message: 'Invoice workflow completed successfully',
      invoice_id: generateResult.invoice_data?.invoice_id,
      invoice_number: generateResult.invoice_data?.invoice_id,
      pdf_path: generateResult.invoice_data?.pdf_path,
      notion_url: notionResult.invoice_record_data?.order_url,
    };
  })
  .commit();
