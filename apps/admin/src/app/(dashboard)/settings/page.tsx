import { useId } from "react";
import { PageShell } from "@/components/page-shell";
import { TeamInvites } from "@/components/team-invites";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const supabaseUrlId = useId();
  const supabaseAnonId = useId();
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
            <label htmlFor={supabaseUrlId} className="text-muted-foreground">
              Project URL
            </label>
            <Input id={supabaseUrlId} placeholder="https://your-project.supabase.co" disabled />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={supabaseAnonId} className="text-muted-foreground">
              Anon key
            </label>
            <Input id={supabaseAnonId} placeholder="••••••••••" disabled />
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
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Invite teammates by email to your current team.
          </p>
          <TeamInvites />
        </CardContent>
      </Card>
    </PageShell>
  );
}
