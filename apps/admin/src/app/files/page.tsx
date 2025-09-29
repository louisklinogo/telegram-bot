import { CloudUpload, Filter } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fileCategories = [
  {
    title: "Measurements",
    count: 42,
    description: "Reference photos and measurement forms",
  },
  {
    title: "Invoices",
    count: 31,
    description: "Generated PDFs stored in Supabase",
  },
  {
    title: "Design Assets",
    count: 18,
    description: "Fabric swatches, sketches, inspiration",
  },
];

export default function FilesPage() {
  return (
    <PageShell
      title="Files"
      description="Browse and manage Cloudinary uploads captured by the Telegram bot."
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" /> Filter
          </Button>
          <Button size="sm" className="gap-2">
            <CloudUpload className="h-4 w-4" /> Upload
          </Button>
        </div>
      }
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {fileCategories.map((category) => (
        <Card key={category.title} className="border-muted">
          <CardHeader>
            <CardTitle className="text-base font-semibold">{category.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{category.description}</p>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <Badge variant="secondary">{category.count} files</Badge>
            <Button variant="ghost" size="sm">
              View
            </Button>
          </CardContent>
        </Card>
      ))}
    </PageShell>
  );
}
