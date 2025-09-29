import { Filter, ListFilter } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const statuses = [
  {
    label: "In production",
    count: 6,
    description: "Currently with tailors",
  },
  {
    label: "Awaiting payment",
    count: 4,
    description: "Invoices sent to clients",
  },
  {
    label: "Ready for pickup",
    count: 3,
    description: "Tagged and packaged",
  },
];

export default function OrdersPage() {
  return (
    <PageShell
      title="Orders"
      description="Monitor tailoring progress and keep every order on schedule."
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" /> Filter
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <ListFilter className="h-4 w-4" /> View batches
          </Button>
        </div>
      }
      className="grid gap-6 lg:grid-cols-2"
    >
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Status overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {statuses.map((status, index) => (
            <div key={status.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium leading-none">{status.label}</p>
                  <p className="text-xs text-muted-foreground">{status.description}</p>
                </div>
                <Badge variant="secondary">{status.count}</Badge>
              </div>
              {index !== statuses.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Workflow timeline</CardTitle>
          <p className="text-sm text-muted-foreground">
            Visualize the standard order journey across Cimantikós.
          </p>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Timeline view is coming soon. Connect Supabase order events to see live progress updates
            here.
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
