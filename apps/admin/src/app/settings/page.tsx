import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  return (
    <PageShell
      title="Settings"
      description="Configure integrations, permissions, and Supabase environment keys."
      className="grid gap-6 lg:grid-cols-2"
    >
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Supabase project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-col gap-1">
            <label htmlFor="supabase-url" className="text-muted-foreground">
              Project URL
            </label>
            <Input id="supabase-url" placeholder="https://your-project.supabase.co" disabled />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="supabase-anon" className="text-muted-foreground">
              Anon key
            </label>
            <Input id="supabase-anon" placeholder="••••••••••" disabled />
          </div>
          <Button size="sm" className="gap-2">
            Rotate keys
          </Button>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Role management</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Invite teammates and control access to the Telegram workflows, Supabase tables, and future
          admin features from a single place.
        </CardContent>
      </Card>
    </PageShell>
  );
}
