"use client";

import { Loader2, Upload, X } from "lucide-react";
import { useState } from "react";
import { deleteLogo, uploadLogo } from "@/actions/upload-logo";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

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
    <div className="group relative h-20 w-20">
      <label className="block h-full w-full cursor-pointer" htmlFor="logo-upload">
        {logoUrl ? (
          <div className="relative h-full w-full">
            <img alt="Invoice logo" className="h-full w-full object-contain" src={logoUrl} />
            <button
              className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => {
                e.preventDefault();
                handleRemove();
              }}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-md border-2 border-muted-foreground/25 border-dashed bg-muted/10 transition-colors hover:border-muted-foreground/50">
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground/50" />
            )}
          </div>
        )}
      </label>

      <input
        accept="image/jpeg,image/jpg,image/png"
        className="hidden"
        disabled={isUploading}
        id="logo-upload"
        onChange={handleUpload}
        type="file"
      />
    </div>
  );
}
