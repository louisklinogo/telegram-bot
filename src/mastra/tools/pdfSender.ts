import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getBotInstance } from './grammyHandler';
import { InputFile } from 'grammy';
import * as fs from 'fs/promises';
import * as path from 'path';

export const pdfSender = createTool({
  id: 'pdf-sender',
  description: 'Send PDF documents to Telegram users',
  inputSchema: z.object({
    chat_id: z.number().optional().describe('The chat ID to send the PDF to (will use runtime context if not provided)'),
    pdf_path: z.string().optional().describe('Local path to the PDF file to send'),
    pdf_url: z.string().optional().describe('Cloudinary URL of the PDF file to send'),
    caption: z.string().optional().describe('Optional caption for the PDF'),
    reply_to_message_id: z.number().optional().describe('Optional message ID to reply to'),
  }),
  execute: async ({ context, runtimeContext }, options) => {
    const { pdf_path, pdf_url, caption, reply_to_message_id } = context;
    
    // Get chat_id from context or runtime context
    const chat_id = context.chat_id || runtimeContext?.chat_id;
    
    if (!chat_id) {
      throw new Error('chat_id must be provided either in context or runtime context');
    }

    if (!pdf_path && !pdf_url) {
      throw new Error('Either pdf_path or pdf_url must be provided');
    }

    const botInstance = getBotInstance();
    if (!botInstance) {
      throw new Error('Bot instance not initialized. Call setBotInstance first.');
    }

    try {
      let document: InputFile | string;
      let filename: string;

      if (pdf_url) {
        // Use Cloudinary URL directly
        console.log('📤 Sending PDF from Cloudinary URL:', pdf_url);
        document = pdf_url;
        filename = 'invoice.pdf'; // Default filename for URL-based documents
      } else if (pdf_path) {
        // Use local file
        console.log('📤 Sending PDF from local file:', pdf_path);
        
        // Check if file exists
        try {
          await fs.access(pdf_path);
        } catch (error) {
          throw new Error(`PDF file not found: ${pdf_path}`);
        }

        // Get file stats for validation
        const stats = await fs.stat(pdf_path);
        const fileSizeInMB = stats.size / (1024 * 1024);
        
        // Telegram has a 50MB file size limit
        if (fileSizeInMB > 50) {
          throw new Error(`PDF file is too large (${fileSizeInMB.toFixed(2)}MB). Maximum size is 50MB.`);
        }

        // Extract filename from path
        filename = path.basename(pdf_path);
        
        // Create InputFile from file path
        document = new InputFile(pdf_path, filename);
      } else {
        throw new Error('No valid PDF source provided');
      }

      // Prepare send options
      const sendOptions: any = {};
      
      if (caption) {
        sendOptions.caption = caption;
        // Don't use parse_mode to avoid formatting errors
      }

      if (reply_to_message_id) {
        sendOptions.reply_to_message_id = reply_to_message_id;
      }

      // Send the document
      const sentMessage = await botInstance.api.sendDocument(chat_id, document, sendOptions);

      return {
        success: true,
        message_id: sentMessage.message_id,
        chat_id: sentMessage.chat.id,
        document_file_id: sentMessage.document?.file_id,
        document_name: sentMessage.document?.file_name,
        file_size: sentMessage.document?.file_size,
        timestamp: sentMessage.date,
        source: pdf_url ? 'cloudinary_url' : 'local_file',
      };

    } catch (error) {
      console.error('Error sending PDF:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred while sending PDF',
      };
    }
  },
});

// Helper function to send invoice PDFs with standard formatting
export const sendInvoicePdf = async (
  chat_id: number,
  options: {
    pdf_path?: string;
    pdf_url?: string;
    customerName: string;
    invoiceNumber: string;
    totalAmount: number;
    reply_to_message_id?: number;
  }
) => {
  const { pdf_path, pdf_url, customerName, invoiceNumber, totalAmount, reply_to_message_id } = options;
  
  const caption = `📄 *Invoice Generated*

*Customer:* ${customerName}
*Invoice #:* ${invoiceNumber}
*Total Amount:* GHS ${totalAmount}

Thank you for choosing Cimantikós Clothing Company! 🧵`;

  try {
    const tool = pdfSender as typeof pdfSender & { execute: NonNullable<typeof pdfSender.execute> };
    return await tool.execute({
      context: {
        chat_id,
        pdf_path,
        pdf_url,
        caption,
        reply_to_message_id,
      },
      runtimeContext: {} as any,
      suspend: async () => {},
    });
  } catch (error) {
    console.error('Error executing PDF sender:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};
