import { getEnvConfig } from "@cimantikos/config";
import { v2 as cloudinary } from "cloudinary";

let isCloudinaryConfigured = false;

/**
 * Configure Cloudinary with validated environment variables
 * Call this once during application startup
 */
export function configureCloudinary(): void {
  if (isCloudinaryConfigured) {
    return; // Already configured
  }

  try {
    const env = getEnvConfig();

    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true, // Use HTTPS
    });

    isCloudinaryConfigured = true;
    console.log("✅ Cloudinary configured successfully");
    console.log(`   Cloud name: ${env.CLOUDINARY_CLOUD_NAME}`);
  } catch (error) {
    console.error("❌ Failed to configure Cloudinary:", error);
    throw error;
  }
}

/**
 * Get configured Cloudinary instance
 * Ensures Cloudinary is configured before returning
 */
export function getCloudinaryInstance() {
  if (!isCloudinaryConfigured) {
    configureCloudinary();
  }
  return cloudinary;
}

/**
 * Upload a file to Cloudinary
 * @param filePath - Local file path
 * @param options - Cloudinary upload options
 */
export async function uploadToCloudinary(
  filePath: string,
  options: {
    folder?: string;
    public_id?: string;
    resource_type?: "image" | "video" | "raw" | "auto";
    transformation?: any;
  } = {},
) {
  const cloudinaryInstance = getCloudinaryInstance();

  const uploadOptions = {
    resource_type: "auto" as const,
    folder: "cimantikos-invoices",
    use_filename: false,
    unique_filename: true,
    overwrite: false,
    access_mode: "public", // Ensure public access by default
    type: "upload", // Explicit upload type
    ...options,
  };

  try {
    console.log(`☁️ Uploading to Cloudinary with options:`, uploadOptions);
    const result = await cloudinaryInstance.uploader.upload(filePath, uploadOptions);
    console.log(`✅ File uploaded to Cloudinary: ${result.public_id}`);
    return result;
  } catch (error) {
    console.error("❌ Cloudinary upload failed:", error);
    throw error;
  }
}

/**
 * Delete a file from Cloudinary
 * @param publicId - The public ID of the file to delete
 * @param resourceType - The resource type
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: "image" | "video" | "raw" = "raw",
) {
  const cloudinaryInstance = getCloudinaryInstance();

  try {
    const result = await cloudinaryInstance.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    console.log(`✅ File deleted from Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    console.error("❌ Cloudinary deletion failed:", error);
    throw error;
  }
}

/**
 * Generate a secure download URL for a Cloudinary file
 * @param publicId - The public ID of the file
 * @param options - URL generation options
 */
export function generateCloudinaryUrl(
  publicId: string,
  options: {
    resource_type?: "image" | "video" | "raw";
    secure?: boolean;
    transformation?: any;
  } = {},
) {
  const cloudinaryInstance = getCloudinaryInstance();

  return cloudinaryInstance.url(publicId, {
    resource_type: "raw",
    secure: true,
    ...options,
  });
}
