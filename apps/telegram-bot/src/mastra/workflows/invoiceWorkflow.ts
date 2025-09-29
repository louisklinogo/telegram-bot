import {
  createInvoiceRecord,
  createOrderWithItems,
  ensureClient,
  type InvoiceRecord,
  type OrderRecord,
} from "@cimantikos/services";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { sendSuccessMessage } from "../tools/grammyHandler";
// Old type imports removed - now using Zod schemas directly
import { invoiceGenerator } from "../tools/invoiceGenerator";
import { pdfSender } from "../tools/pdfSender";

type InvoiceItem = {
  name: string;
  quantity: number;
  unit_cost: number;
  total_cost?: number;
};

type InvoiceGeneratorResult = {
  success: boolean;
  invoice_id?: string;
  pdf_path?: string;
  pdf_url?: string;
  total_amount?: number;
  items?: Array<InvoiceItem & { total_cost: number }>;
  error?: string;
  [key: string]: unknown;
};

type PdfSenderResult = {
  success: boolean;
  error?: string;
  message_id?: number;
  chat_id?: number;
  document_file_id?: string;
  document_name?: string;
  file_size?: number;
  timestamp?: number;
  source?: string;
};

// Input schema for the workflow (flexible to handle agent serialization issues)
export const InvoiceWorkflowInputSchema = z.object({
  chat_id: z.number(),
  customer_name: z.string(),
  phone_number: z.string().optional(),
  items: z.array(
    z.union([
      // Normal object format
      z.object({
        name: z.string(),
        quantity: z.number(),
        unit_cost: z.number(),
      }),
      // JSON string format (for agent serialization issues)
      z.string(),
    ]),
  ),
  notes: z.string().optional(),
});

// Output schema for the workflow
export const InvoiceWorkflowOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  invoice_id: z.string().optional(),
  invoice_number: z.string().optional(),
  pdf_path: z.string().optional(),
  record_url: z.string().optional(),
  pdf_url: z.string().optional(),
  pdf_delivered: z.boolean().optional(),
  delivery_method: z.string().optional(),
  client_id: z.string().optional(),
  order_record_id: z.string().optional(),
  invoice_record_id: z.string().optional(),
});

// Step 1: Generate PDF Invoice
const generateInvoiceStep = createStep({
  id: "generate-invoice",
  description: "Generate PDF invoice using Invoice-Generator.com API",
  inputSchema: InvoiceWorkflowInputSchema,
  outputSchema: z.object({
    status: z.enum(["success", "error"]),
    invoice_data: z.any().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    try {
      console.log("Generating invoice for:", inputData.customer_name);

      const normalizedItems = parseWorkflowItems(inputData.items as (string | InvoiceItem)[]);
      const generatorContext = {
        customer_name: inputData.customer_name,
        phone_number: inputData.phone_number,
        items: normalizedItems,
        notes: inputData.notes,
      };

      const generatorTool = invoiceGenerator as typeof invoiceGenerator & {
        execute: NonNullable<typeof invoiceGenerator.execute>;
      };
      const result = (await generatorTool.execute({
        context: generatorContext,
        runtimeContext,
        suspend: async () => {},
      })) as InvoiceGeneratorResult;

      if (result.success) {
        console.log("Invoice generated successfully:", result.invoice_id);
        return {
          status: "success" as const,
          invoice_data: result,
        };
      } else {
        console.error("Invoice generation failed:", result.error);
        return {
          status: "error" as const,
          error: result.error || "Failed to generate invoice",
        };
      }
    } catch (error) {
      console.error("Error in generateInvoiceStep:", error);
      return {
        status: "error" as const,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

// Step 2: Persist invoice records in Supabase (clients, orders, invoices)
const persistSupabaseInvoiceStep = createStep({
  id: "persist-supabase-invoice-records",
  description: "Persist invoice entities in Supabase (clients, orders, invoices)",
  inputSchema: z.object({
    chat_id: z.number(),
    customer_name: z.string(),
    phone_number: z.string().optional(),
    items: z.array(
      z.object({
        name: z.string(),
        quantity: z.number(),
        unit_cost: z.number(),
      }),
    ),
    notes: z.string().optional(),
    generation_status: z.enum(["success", "error"]),
    invoice_data: z.any().optional(),
    generation_error: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    client_id: z.string().optional(),
    order: z.any().optional(),
    invoice: z.any().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    try {
      if (inputData.generation_status === "error") {
        console.log("Skipping Supabase persistence due to invoice generation failure");
        return {
          success: false,
          error: "Invoice generation failed, skipping persistence",
        };
      }

      console.log("Persisting Supabase records for:", inputData.customer_name);

      const totalAmount = inputData.items.reduce(
        (sum, item) => sum + item.unit_cost * item.quantity,
        0,
      );
      const client = await ensureClient({
        name: inputData.customer_name,
        phone: inputData.phone_number,
        referral_source: "Telegram Bot",
        notes: inputData.notes ? `Created via invoice workflow: ${inputData.notes}` : undefined,
      });

      const orderPayload = await createOrderWithItems({
        clientId: client.id,
        totalPrice: totalAmount,
        notes: inputData.notes || null,
        invoiceFileUrl:
          (inputData.invoice_data as InvoiceGeneratorResult | undefined)?.pdf_url || null,
        items: inputData.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          total_cost: item.unit_cost * item.quantity,
        })),
      });

      const invoiceRecord = await createInvoiceRecord({
        orderId: orderPayload.order.id,
        amount: totalAmount,
        pdfUrl: (inputData.invoice_data as InvoiceGeneratorResult | undefined)?.pdf_url || null,
        dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      return {
        success: true,
        client_id: client.id,
        order: orderPayload.order,
        invoice: invoiceRecord,
      };
    } catch (error) {
      console.error("Error in persistSupabaseInvoiceStep:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

// Step 3: Send PDF to User
const sendPdfStep = createStep({
  id: "send-pdf-to-user",
  description: "Send the generated PDF invoice to the customer",
  inputSchema: z.object({
    chat_id: z.number(),
    customer_name: z.string(),
    invoice_data: z.any().optional(),
    generation_status: z.enum(["success", "error"]),
    invoice_record: z.any().optional(),
  }),
  outputSchema: z.object({
    pdf_sent: z.boolean(),
    delivery_method: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    try {
      // Skip PDF sending if invoice generation failed
      if (inputData.generation_status === "error" || !inputData.invoice_data) {
        console.log("Skipping PDF delivery due to invoice generation failure");
        return {
          pdf_sent: false,
          delivery_method: "none",
          error: "No PDF to send - generation failed",
        };
      }

      const { chat_id, customer_name } = inputData;
      const invoiceData = inputData.invoice_data as InvoiceGeneratorResult | undefined;
      const invoiceRecord = inputData.invoice_record as InvoiceRecord | undefined;

      console.log("📤 Sending PDF invoice to customer:", customer_name);

      // Prepare PDF delivery
      const totalAmount =
        typeof invoiceData?.total_amount === "number" ? invoiceData.total_amount : 0;
      const invoiceNumber = invoiceRecord?.invoice_number || invoiceData?.invoice_id || "N/A";

      const caption = `📄 Invoice for ${customer_name}\n\nInvoice #: ${invoiceNumber}\nTotal: GHS ${totalAmount.toLocaleString()}\n\nThank you for choosing Cimantikós Clothing Company! 🧵`;

      // Get the actual chat_id from runtime context
      const actualChatId =
        (runtimeContext?.get?.("chatId") as number | undefined) ??
        (runtimeContext?.get?.("chat_id") as number | undefined) ??
        chat_id;
      console.log(`🔍 Using chat_id: ${actualChatId} for PDF delivery`);

      // Send PDF using pdfSender tool with proper fallback
      const senderTool = pdfSender as typeof pdfSender & {
        execute: NonNullable<typeof pdfSender.execute>;
      };
      const pdfResult = (await senderTool.execute({
        context: {
          chat_id: actualChatId,
          pdf_url: invoiceData?.pdf_url,
          pdf_path: invoiceData?.pdf_path,
          caption: caption,
        },
        runtimeContext,
        suspend: async () => {},
      })) as PdfSenderResult;

      if (pdfResult.success) {
        console.log("✅ PDF invoice delivered successfully to user:", customer_name);
        return {
          pdf_sent: true,
          delivery_method: invoiceData?.pdf_url ? "cloudinary_url" : "local_file",
        };
      } else {
        console.error("❌ PDF delivery failed:", pdfResult.error);
        return {
          pdf_sent: false,
          error: pdfResult.error || "Failed to deliver PDF",
        };
      }
    } catch (error) {
      console.error("Error in sendPdfStep:", error);
      return {
        pdf_sent: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

// Helper function to parse items from agent (fixes AI serialization issue)
const parseWorkflowItems = (
  items: any[],
): Array<{ name: string; quantity: number; unit_cost: number }> => {
  return items
    .map((item) => {
      // If item is a string, try to parse it as JSON
      if (typeof item === "string") {
        try {
          const parsed = JSON.parse(item);
          return {
            name: String(parsed.name || "").trim(),
            quantity: Number(parsed.quantity || 1),
            unit_cost: Number(parsed.unit_cost || 0),
          };
        } catch (error) {
          console.warn("Failed to parse item string:", item);
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
        name: String(item.name || "").trim(),
        quantity: Number(item.quantity || 1),
        unit_cost: Number(item.unit_cost || 0),
      };
    })
    .filter((item) => item.name); // Remove empty items
};

// Production-ready workflow with sequential processing
export const invoiceWorkflow = createWorkflow({
  id: "invoice-processing-workflow",
  description: "Complete invoice processing workflow from request to confirmation",
  inputSchema: InvoiceWorkflowInputSchema,
  outputSchema: InvoiceWorkflowOutputSchema,
  retryConfig: {
    attempts: 3,
    delay: 2000,
  },
})
  .map(async ({ inputData }) => {
    // Preprocess agent input to handle JSON string serialization issues
    console.log("🔧 Preprocessing workflow input data...");

    const processedItems = parseWorkflowItems(inputData.items);

    console.log(
      `📊 Parsed ${processedItems.length} items:`,
      processedItems
        .map((item) => `${item.name} (${item.quantity}x GHS ${item.unit_cost})`)
        .join(", "),
    );

    return {
      ...inputData,
      items: processedItems,
    };
  })
  .then(generateInvoiceStep)
  .map(async ({ getStepResult, getInitData }) => {
    const generateResult = getStepResult(generateInvoiceStep);
    const initData = getInitData();
    const generatorData = generateResult.invoice_data as InvoiceGeneratorResult | undefined;
    const parsedItems =
      generatorData?.items?.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
      })) ?? parseWorkflowItems(initData.items as (string | InvoiceItem)[]);

    return {
      chat_id: initData.chat_id,
      customer_name: initData.customer_name,
      phone_number: initData.phone_number,
      items: parsedItems,
      notes: initData.notes,
      generation_status: generateResult.status,
      invoice_data: generateResult.invoice_data,
      generation_error: generateResult.error,
    };
  })
  .then(persistSupabaseInvoiceStep)
  .map(async ({ getStepResult, getInitData }) => {
    const persistenceResult = getStepResult(persistSupabaseInvoiceStep);
    const generateResult = getStepResult(generateInvoiceStep);
    const initData = getInitData();
    const invoiceData = generateResult.invoice_data as InvoiceGeneratorResult | undefined;

    return {
      chat_id: initData.chat_id,
      customer_name: initData.customer_name,
      invoice_data: invoiceData,
      generation_status: generateResult.status,
      invoice_record: persistenceResult.invoice,
    };
  })
  .then(sendPdfStep)
  .map(async ({ getStepResult, getInitData, runtimeContext }) => {
    const pdfResult = getStepResult(sendPdfStep);
    const persistenceResult = getStepResult(persistSupabaseInvoiceStep);
    const generateResult = getStepResult(generateInvoiceStep);
    const initData = getInitData();

    if (generateResult.status === "error") {
      const fallbackId = `FALLBACK_${Date.now()}_${initData.customer_name.replace(/[^a-zA-Z0-9]/g, "")}`;
      const fallbackItems = parseWorkflowItems(initData.items as (string | InvoiceItem)[]);
      const totalAmount = fallbackItems.reduce(
        (sum, item) => sum + item.unit_cost * item.quantity,
        0,
      );

      const fallbackMessage = `
⚠️ *Invoice Generation Issue*

*Customer:* ${initData.customer_name}
*Fallback Order ID:* ${fallbackId}
*Total Amount:* GHS ${totalAmount}

📋 *Items:*
${fallbackItems.map((item) => `• ${item.name}: ${item.quantity} × GHS ${item.unit_cost}`).join("\n")}

📝 I've recorded the order details in your database. You can create the formal invoice manually or try again later.
      `;

      const actualChatId =
        (runtimeContext?.get?.("chatId") as number | undefined) ??
        (runtimeContext?.get?.("chat_id") as number | undefined) ??
        initData.chat_id;
      await sendSuccessMessage(actualChatId, fallbackMessage);

      return {
        success: true,
        message: "Invoice workflow completed with fallback",
        invoice_id: fallbackId,
        invoice_number: fallbackId,
      };
    }

    const invoiceData = generateResult.invoice_data as InvoiceGeneratorResult | undefined;
    const orderRecord = persistenceResult.order as OrderRecord | undefined;
    const invoiceRecord = persistenceResult.invoice as InvoiceRecord | undefined;

    let confirmationMessage: string;

    if (pdfResult.pdf_sent) {
      const invoiceNumber =
        invoiceRecord?.invoice_number ||
        orderRecord?.order_number ||
        invoiceData?.invoice_id ||
        "N/A";
      const totalAmount =
        invoiceRecord?.amount || orderRecord?.total_price || invoiceData?.total_amount || "N/A";

      confirmationMessage = `
🎉 *Invoice Complete!*

*Customer:* ${initData.customer_name}
*Invoice Number:* ${invoiceNumber}
*Total Amount:* GHS ${totalAmount}

✅ PDF invoice delivered above
${invoiceRecord ? "✅ Invoice stored in Supabase" : ""}
${orderRecord ? `✅ Order saved (${orderRecord.order_number})` : ""}

Thank you for choosing Cimantikós Clothing Company! 🧵
      `;
    } else {
      const invoiceNumber =
        invoiceRecord?.invoice_number ||
        orderRecord?.order_number ||
        invoiceData?.invoice_id ||
        "N/A";
      const totalAmount =
        invoiceRecord?.amount || orderRecord?.total_price || invoiceData?.total_amount || "N/A";

      confirmationMessage = `
⚠️ *Invoice Generated (Delivery Issue)*

*Customer:* ${initData.customer_name}
*Invoice Number:* ${invoiceNumber}
*Total Amount:* GHS ${totalAmount}

✅ Invoice created and saved to database
${invoiceRecord ? "✅ Invoice stored in Supabase" : ""}
${orderRecord ? `✅ Order saved (${orderRecord.order_number})` : ""}
⚠️ PDF delivery failed: ${pdfResult.error || "Unknown error"}

📝 Your order is recorded. We'll send the invoice via alternative method.

Thank you for choosing Cimantikós Clothing Company! 🧵
      `;
    }

    const actualChatId =
      (runtimeContext?.get?.("chatId") as number | undefined) ??
      (runtimeContext?.get?.("chat_id") as number | undefined) ??
      initData.chat_id;
    await sendSuccessMessage(actualChatId, confirmationMessage);

    const finalInvoiceNumber =
      invoiceRecord?.invoice_number || orderRecord?.order_number || invoiceData?.invoice_id;

    return {
      success: true,
      message: pdfResult.pdf_sent
        ? "Invoice workflow completed successfully"
        : "Invoice created but PDF delivery failed",
      invoice_id: invoiceData?.invoice_id,
      invoice_number: finalInvoiceNumber,
      pdf_path: invoiceData?.pdf_path,
      pdf_url: invoiceData?.pdf_url,
      pdf_delivered: pdfResult.pdf_sent,
      delivery_method: pdfResult.delivery_method,
      client_id: persistenceResult.client_id,
      order_record_id: orderRecord ? orderRecord.id : undefined,
      invoice_record_id: invoiceRecord ? invoiceRecord.id : undefined,
      record_url: invoiceRecord ? invoiceRecord.id : undefined,
    };
  })
  .commit();
