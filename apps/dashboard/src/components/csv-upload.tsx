"use client";

import { Button } from "@/components/ui/button";
import { Upload, Download } from "lucide-react";
import { useRef } from "react";
import Papa from "papaparse";
import { toast } from "sonner";

type CSVUploadProps = {
  onUpload: (data: any[]) => void;
};

export function CSVUpload({ onUpload }: CSVUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast.error("Error parsing CSV file");
          console.error(results.errors);
          return;
        }

        onUpload(results.data);
        toast.success(`Imported ${results.data.length} clients`);
      },
      error: (error) => {
        toast.error("Failed to parse CSV");
        console.error(error);
      },
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        name: "John Doe",
        phone: "+233241234567",
        whatsapp: "+233241234567",
        email: "john@example.com",
        address: "123 Main St, Accra",
        country: "Ghana",
        countryCode: "GH",
        company: "Acme Inc",
        occupation: "Business Owner",
        referralSource: "Instagram",
        tags: "VIP,Regular",
        notes: "Prefers kaftans",
      },
    ];

    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clients-template.csv";
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success("Template downloaded");
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        Import CSV
      </Button>

      <Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
        <Download className="h-4 w-4" />
        Template
      </Button>
    </div>
  );
}
