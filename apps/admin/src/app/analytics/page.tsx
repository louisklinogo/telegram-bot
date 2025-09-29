import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <PageShell
      title="Performance Analytics"
      description="Supabase metrics and dashboards coming soon."
      className="grid gap-4 md:grid-cols-2"
    >
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Revenue trends</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Connect Supabase Postgres views or external BI tooling to surface monthly revenue
          insights, customer acquisition trends, and invoice payment velocity.
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Operational efficiency</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Track lead times from measurement collection to final delivery. Integrate with the
          workflow tracing already captured via Mastra.
        </CardContent>
      </Card>
    </PageShell>
  );
}
