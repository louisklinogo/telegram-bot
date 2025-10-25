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
        <Button className="gap-2" size="sm" variant="outline">
          <Filter className="h-4 w-4" /> Filter
        </Button>
        <Button className="gap-2" size="sm">
          <CloudUpload className="h-4 w-4" /> Upload
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fileCategories.map((category) => (
          <Card className="border-muted" key={category.title}>
            <CardHeader>
              <CardTitle className="font-semibold text-base">{category.title}</CardTitle>
              <p className="text-muted-foreground text-sm">{category.description}</p>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Badge variant="secondary">{category.count} files</Badge>
              <Button size="sm" variant="ghost">
                View
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
