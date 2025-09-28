import { createTool } from '@mastra/core';
import { z } from 'zod';
import { invoiceWorkflow } from '../workflows/invoiceWorkflow';

// Input validation schema for invoice workflow trigger
const InvoiceWorkflowTriggerInputSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  phone_number: z.string().optional(),
  items: z.array(z.object({
    name: z.string().min(1, "Item name is required"),
    quantity: z.number().positive("Quantity must be positive"),
    unit_cost: z.number().positive("Unit cost must be positive"),
  })).min(1, "At least one item is required"),
  notes: z.string().optional(),
});

// Output schema for immediate response
const InvoiceWorkflowTriggerOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  workflow_id: z.string().optional(),
  estimated_completion: z.string().optional(),
  error: z.string().optional(),
});

/**
 * Invoice Workflow Trigger Tool
 * 
 * Lightweight tool that immediately triggers the invoice workflow and returns
 * a response to the user. The workflow handles all heavy operations (PDF generation,
 * Notion updates, file uploads) in the background.
 * 
 * This solves the timeout issues by:
 * 1. Immediate validation and response (< 1 second)
 * 2. Background workflow processing (no timeout limits)
 * 3. User receives progress updates via workflow messaging
 */
export const invoiceWorkflowTrigger = createTool({
  id: 'invoice-workflow-trigger',
  description: 'Triggers the complete invoice generation workflow for a customer order',
  inputSchema: InvoiceWorkflowTriggerInputSchema,
  outputSchema: InvoiceWorkflowTriggerOutputSchema,
  
  execute: async ({ context, runtimeContext }) => {
    try {
      // Extract chat_id from runtime context for workflow
      const chatId = runtimeContext?.chatId || runtimeContext?.chat_id;
      
      if (!chatId) {
        return {
          success: false,
          message: "Unable to process invoice: chat context not available",
          error: "Missing chat_id in runtime context"
        };
      }

      // Validate input data
      const validatedInput = InvoiceWorkflowTriggerInputSchema.parse(context);
      
      // Calculate total for user confirmation
      const totalAmount = validatedInput.items.reduce(
        (sum, item) => sum + (item.unit_cost * item.quantity), 
        0
      );

      // Prepare workflow input
      const workflowInput = {
        chat_id: chatId,
        customer_name: validatedInput.customer_name,
        phone_number: validatedInput.phone_number,
        items: validatedInput.items,
        notes: validatedInput.notes,
      };

      // Generate workflow ID for tracking
      const workflowId = `invoice_${Date.now()}_${validatedInput.customer_name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
      
      // Start workflow in background (fire-and-forget)
      // The workflow will handle all user communication from this point
      invoiceWorkflow.execute(workflowInput, {
        workflowId,
        ...runtimeContext
      }).catch((error) => {
        // Log workflow errors but don't block the immediate response
        console.error(`Invoice workflow ${workflowId} failed:`, error);
      });

      // Return immediate success response to user
      const itemsList = validatedInput.items
        .map(item => `${item.quantity}× ${item.name} (GHS ${item.unit_cost})`)
        .join('\n');

      const confirmationMessage = `🚀 **Invoice Processing Started**

**Customer:** ${validatedInput.customer_name}
**Total Amount:** GHS ${totalAmount.toLocaleString()}

**Items:**
${itemsList}

⏳ I'm now generating your invoice and will send it to you shortly. This includes:
• PDF invoice generation
• Order record in our system
• File delivery to your chat

Please wait a moment...`;

      return {
        success: true,
        message: confirmationMessage,
        workflow_id: workflowId,
        estimated_completion: "30-60 seconds"
      };

    } catch (error) {
      // Handle validation or processing errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      console.error('Invoice workflow trigger error:', error);
      
      return {
        success: false,
        message: "⚠️ Unable to start invoice processing. Please check your input and try again.",
        error: errorMessage
      };
    }
  },
});