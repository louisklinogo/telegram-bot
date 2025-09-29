import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const services = [
  {
    name: "Supabase",
    status: "Healthy",
    detail: "Connected via service key",
  },
  {
    name: "Telegram Bot",
    status: "Healthy",
    detail: "Webhook responding",
  },
  {
    name: "File Storage",
    status: "Monitoring",
    detail: "Cloudinary API metrics",
  },
];

export default function HealthPage() {
  return (
    <PageShell
      title="System Health"
      description="Surface the same health check data already powering the bot monitors."
      className="grid gap-4 md:grid-cols-2"
    >
      {services.map((service) => (
        <Card key={service.name} className="border-muted">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold">{service.name}</CardTitle>
            <Badge variant={service.status === "Healthy" ? "secondary" : "outline"}>
              {service.status}
            </Badge>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{service.detail}</CardContent>
        </Card>
      ))}

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Telemetry feed</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Hook into the existing Mastra health checker to stream heartbeat data and alerting
          thresholds directly into this dashboard.
        </CardContent>
      </Card>
    </PageShell>
  );
}
