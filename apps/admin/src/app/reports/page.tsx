import { Download, FileText } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <PageShell
      title="Reports"
      description="Scheduled exports and KPIs generated from Supabase data."
      headerActions={
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" /> Export all
        </Button>
      }
      className="grid gap-4 md:grid-cols-2"
    >
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Weekly summary</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            Orders, invoices, payment status, measurement volume.
          </div>
          <Button variant="ghost" size="sm" className="gap-2">
            <FileText className="h-4 w-4" /> Generate
          </Button>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Custom report builder</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Design saved report templates that query Supabase via RPC or views. Configure delivery
          schedules (email, Telegram, Slack) right from this interface.
        </CardContent>
      </Card>
    </PageShell>
  );
}
