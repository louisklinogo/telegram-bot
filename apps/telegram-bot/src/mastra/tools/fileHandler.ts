import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { FileRecord } from "@cimantikos/services";
import { recordFile, uploadToCloudinary } from "@cimantikos/services";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getBotInstance } from "./grammyHandler";

export type FileHandlerResult =
  | {
      success: true;
      file_type: "photo" | "document";
      file_name: string;
      file_size: number;
      cloudinary_url?: string;
      cloudinary_public_id?: string;
      telegram_file_id: string;
      processed_at: string;
      caption?: string;
      supabase_record_id?: string;
    }
  | {
      success: false;
      error: string;
      file_id?: string;
      chat_id?: number;
    };

export const fileHandler = createTool({
  id: "file-handler",
  description: "Process files (images and documents) sent by users",
  inputSchema: z.object({
    chat_id: z.number().optional().describe("The chat ID"),
    file_id: z.string().describe("Telegram file ID"),
    file_type: z.enum(["photo", "document"]).describe("Type of file"),
    file_name: z.string().optional().describe("Original filename"),
    caption: z.string().optional().describe("Caption provided with the file"),
  }),
  execute: async ({ context, runtimeContext }): Promise<FileHandlerResult> => {
    const { file_id, file_type, file_name, caption } = context;
    const chat_id =
      context.chat_id || runtimeContext?.get?.("chat_id") || runtimeContext?.get?.("chatId");

    console.log(`🔄 Processing ${file_type} with file_id: ${file_id}, chat_id: ${chat_id}`);

    if (!chat_id) {
      throw new Error("chat_id must be provided");
    }

    if (!file_id || typeof file_id !== "string" || file_id.trim().length === 0) {
      throw new Error("Valid file_id must be provided");
    }

    const botInstance = getBotInstance();
    if (!botInstance) {
      throw new Error("Bot instance not initialized");
    }

    try {
      // Validate file_id format (basic check) - Telegram file IDs can contain various characters
      if (file_id.length > 250 || file_id.length < 10) {
        throw new Error("Invalid file_id length");
      }

      // Get file info from Telegram
      console.log(`📁 Getting file info for file_id: ${file_id}`);
      const file = await botInstance.api.getFile(file_id);

      if (!file.file_path) {
        throw new Error("Could not retrieve file path from Telegram");
      }

      // Download the file
      const fileUrl = `https://api.telegram.org/file/bot${botInstance.token}/${file.file_path}`;
      console.log(`📁 Downloading ${file_type}: ${fileUrl}`);

      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Create temporary file
      const tempDir = "temp-files";
      await fs.mkdir(tempDir, { recursive: true });

      const fileExtension =
        path.extname(file.file_path) || (file_type === "photo" ? ".jpg" : ".pdf");
      const tempFilePath = path.join(tempDir, `${file_id}${fileExtension}`);

      await fs.writeFile(tempFilePath, buffer);

      // Upload to Cloudinary
      const publicId = `files/${Date.now()}_${file_id}`;

      console.log(`☁️ Uploading to Cloudinary...`);

      const uploadResult = await uploadToCloudinary(tempFilePath, {
        public_id: publicId,
        resource_type: file_type === "photo" ? "image" : "raw",
      });

      // Clean up temporary file
      await fs.unlink(tempFilePath);

      // Send confirmation
      const fileSize = (buffer.length / 1024).toFixed(1);
      const confirmationMessage = `✅ **File Processed**

📁 **${file_type === "photo" ? "Image" : "Document"}** received and saved
📏 **Size:** ${fileSize} KB
${file_name ? `📄 **Name:** ${file_name}` : ""}
${caption ? `💬 **Caption:** ${caption}` : ""}

The file has been processed and is available for the agent to analyze.`;

      await botInstance.api.sendMessage(chat_id, confirmationMessage);

      const fileRecord: FileRecord | null = uploadResult?.secure_url
        ? await recordFile({
            cloudinary_public_id: uploadResult.public_id,
            cloudinary_url: uploadResult.secure_url,
            file_type: file_type,
            telegram_file_id: file_id,
            chat_id,
            caption,
          }).catch((error) => {
            console.error("Failed to record file metadata in Supabase:", error);
            return null;
          })
        : null;

      const result: FileHandlerResult = {
        success: true,
        file_type,
        file_name: file_name || `${file_type}_${Date.now()}${fileExtension}`,
        file_size: buffer.length,
        cloudinary_url: uploadResult?.secure_url,
        cloudinary_public_id: uploadResult?.public_id,
        telegram_file_id: file_id,
        processed_at: new Date().toISOString(),
        caption,
      };

      if (fileRecord) {
        result.supabase_record_id = fileRecord.id;
      }

      return result;
    } catch (error) {
      console.error("Error processing file:", error);

      // Try to send error message to user, but only if chat_id is valid
      if (chat_id && typeof chat_id === "number" && chat_id > 0) {
        try {
          await botInstance.api.sendMessage(
            chat_id,
            "❌ Sorry, I encountered an error processing your file. Please try again.",
          );
        } catch (msgError) {
          console.error("Failed to send error message to chat", chat_id, ":", msgError);
        }
      }

      const errorResult: FileHandlerResult = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        file_id,
        chat_id,
      };

      return errorResult;
    }
  },
});

// Helper functions
export const processImage = async (
  chat_id: number,
  file_id: string,
  caption?: string,
): Promise<FileHandlerResult> => {
  const tool = fileHandler as typeof fileHandler & {
    execute: NonNullable<typeof fileHandler.execute>;
  };
  const runtimeContext = new RuntimeContext();
  runtimeContext.set("chat_id", chat_id);
  const result = (await tool.execute({
    context: {
      chat_id,
      file_id,
      file_type: "photo" as const,
      caption,
    },
    runtimeContext,
    suspend: async () => {},
  })) as FileHandlerResult;

  return result;
};

export const processDocument = async (
  chat_id: number,
  file_id: string,
  file_name?: string,
  caption?: string,
): Promise<FileHandlerResult> => {
  const tool = fileHandler as typeof fileHandler & {
    execute: NonNullable<typeof fileHandler.execute>;
  };
  const runtimeContext = new RuntimeContext();
  runtimeContext.set("chat_id", chat_id);
  const result = (await tool.execute({
    context: {
      chat_id,
      file_id,
      file_type: "document" as const,
      file_name,
      caption,
    },
    runtimeContext,
    suspend: async () => {},
  })) as FileHandlerResult;

  return result;
};
