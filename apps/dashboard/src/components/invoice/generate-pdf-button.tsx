"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { pdf } from "@react-pdf/renderer";
import { InvoicePDF } from "./invoice-pdf";

interface GeneratePDFButtonProps {
  invoice: any;
  items: any[];
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function GeneratePDFButton({
  invoice,
  items,
  variant = "outline",
  size = "sm",
}: GeneratePDFButtonProps) {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const handleGeneratePDF = async () => {
    setGenerating(true);

    try {
      // Prepare data for PDF
      const pdfData = {
        invoice: {
          invoiceNumber: invoice.invoiceNumber || "INV-000",
          issueDate: invoice.createdAt || new Date().toISOString(),
          dueDate: invoice.dueDate,
          subtotal: Number(invoice.subtotal) || 0,
          tax: Number(invoice.tax) || 0,
          discount: Number(invoice.discount) || 0,
          amount: Number(invoice.amount) || 0,
          notes: invoice.notes,
          logoUrl: invoice.logoUrl,
          status: invoice.status || "draft",
        },
        items: items.map((item) => ({
          name: item.name,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
        })),
        from: {
          name: "FaworraClothing",
          address: "Accra, Ghana",
          phone: "+233 XXX XXX XXX",
        },
        to: {
          name: invoice.clientName || "Customer",
          address: invoice.clientAddress || undefined,
        },
      };

      // Generate PDF
      const blob = await pdf(<InvoicePDF {...pdfData} />).toBlob();

      // Download PDF
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoice.invoiceNumber || "invoice"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "PDF generated successfully!",
        description: `${invoice.invoiceNumber}.pdf downloaded`,
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Failed to generate PDF",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleGeneratePDF}
      disabled={generating}
      className="gap-2"
    >
      {generating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Download PDF
        </>
      )}
    </Button>
  );
}
