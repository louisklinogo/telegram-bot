import { Download, FileSpreadsheet, Plus } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const invoices = [
  {
    number: "INV-1041",
    client: "Adwoa Mensah",
    amount: "₵1,580",
    status: "Pending",
  },
  {
    number: "INV-1039",
    client: "Kofi Owusu",
    amount: "₵980",
    status: "Paid",
  },
  {
    number: "INV-1038",
    client: "Ama Boateng",
    amount: "₵2,430",
    status: "Overdue",
  },
];

export default function InvoicesPage() {
  return (
    <PageShell
      title="Invoices"
      description="Track payments across Supabase records and keep cash flow steady."
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Create invoice
          </Button>
        </div>
      }
      className="grid gap-4"
    >
      {invoices.map((invoice) => (
        <Card key={invoice.number} className="border-muted">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold">{invoice.number}</CardTitle>
              <p className="text-sm text-muted-foreground">{invoice.client}</p>
            </div>
            <Badge
              variant={
                invoice.status === "Paid"
                  ? "secondary"
                  : invoice.status === "Overdue"
                    ? "destructive"
                    : "outline"
              }
            >
              {invoice.status}
            </Badge>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-sm">
            <span className="font-medium">{invoice.amount}</span>
            <Button variant="ghost" size="sm" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" /> View in Supabase
            </Button>
          </CardContent>
        </Card>
      ))}
    </PageShell>
  );
}
