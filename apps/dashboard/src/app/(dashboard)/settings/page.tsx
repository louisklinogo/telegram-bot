import { useId } from "react";
import { TeamInvites } from "@/components/team-invites";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const supabaseUrlId = useId();
  const supabaseAnonId = useId();
  return (
    <div className="grid gap-6 px-6 py-6 lg:grid-cols-2">
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="font-semibold text-base">Supabase project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground" htmlFor={supabaseUrlId}>
              Project URL
            </label>
            <Input disabled id={supabaseUrlId} placeholder="https://your-project.supabase.co" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground" htmlFor={supabaseAnonId}>
              Anon key
            </label>
            <Input disabled id={supabaseAnonId} placeholder="••••••••••" />
          </div>
          <Button className="gap-2" size="sm">
            Rotate keys
          </Button>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="font-semibold text-base">Role management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-muted-foreground text-sm">
            Invite teammates by email to your current team.
          </p>
          <TeamInvites />
        </CardContent>
      </Card>
    </div>
  );
}
