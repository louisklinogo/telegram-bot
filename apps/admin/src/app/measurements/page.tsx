import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const measurementTemplates = [
  {
    title: "Menswear Essentials",
    fields: "CH, ST, SL, SH, LT, NK, WT",
    usage: "Default for male bespoke orders",
  },
  {
    title: "Womenswear Premium",
    fields: "BU, WA, HP, BL, ARM, LT",
    usage: "High-fashion fittings",
  },
  {
    title: "Adjustments",
    fields: "LT, WT, SL",
    usage: "Quick alteration workflow",
  },
];

export default function MeasurementsPage() {
  return (
    <PageShell
      title="Measurements"
      description="Centralize measurement records synced from the Telegram workflow."
      className="grid gap-4 lg:grid-cols-2"
    >
      {measurementTemplates.map((template) => (
        <Card key={template.title} className="border-muted">
          <CardHeader>
            <CardTitle className="text-base font-semibold">{template.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{template.usage}</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">Tracked fields</p>
            <Badge variant="secondary" className="w-fit">
              {template.fields}
            </Badge>
          </CardContent>
        </Card>
      ))}

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Smart validation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Measurement validation rules from the Telegram measurement workflow will appear here.
          Configure warning thresholds, dual-length input formats, and Supabase storage logic.
        </CardContent>
      </Card>
    </PageShell>
  );
}
