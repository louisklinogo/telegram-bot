import { CloudUpload, Filter } from "lucide-react";
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
    <div className="px-6 py-6">
      <div className="mb-4 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" /> Filter
        </Button>
        <Button size="sm" className="gap-2">
          <CloudUpload className="h-4 w-4" /> Upload
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
      </div>
    </div>
  );
}
