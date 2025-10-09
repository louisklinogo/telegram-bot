"use client";

import { useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { uploadLogo, deleteLogo } from "@/actions/upload-logo";

interface InvoiceLogoProps {
  logoUrl?: string | null;
  onUpload: (url: string) => void;
  onRemove: () => void;
}

export function InvoiceLogo({ logoUrl, onUpload, onRemove }: InvoiceLogoProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadLogo(formData);

      if (result.error) {
        toast({
          title: "Upload failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      if (result.url) {
        onUpload(result.url);
        toast({ title: "Logo uploaded successfully!" });
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!logoUrl) return;

    try {
      const result = await deleteLogo(logoUrl);

      if (result.error) {
        toast({
          title: "Delete failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      onRemove();
      toast({ title: "Logo removed" });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative h-20 w-20 group">
      <label htmlFor="logo-upload" className="block h-full w-full cursor-pointer">
        {logoUrl ? (
          <div className="relative h-full w-full">
            <img src={logoUrl} alt="Invoice logo" className="h-full w-full object-contain" />
            <button
              type="button"
              className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.preventDefault();
                handleRemove();
              }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="h-full w-full border-2 border-dashed border-muted-foreground/25 rounded-md flex items-center justify-center hover:border-muted-foreground/50 transition-colors bg-muted/10">
            {isUploading ? (
              <Loader2 className="h-8 w-8 text-muted-foreground/50 animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground/50" />
            )}
          </div>
        )}
      </label>

      <input
        id="logo-upload"
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        className="hidden"
        onChange={handleUpload}
        disabled={isUploading}
      />
    </div>
  );
}
