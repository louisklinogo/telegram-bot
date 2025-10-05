"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@cimantikos/ui/label";
import { trpc } from "@/lib/trpc/client";
import { useAuthReady } from "@/hooks/use-auth-ready";

export default function CreateTeamPage() {
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const authReady = useAuthReady();
  const { mutate: createTeam, isPending } = trpc.teams.create.useMutation({
    onSuccess: () => {
      // Redirect to dashboard
      router.push("/");
      router.refresh();
    },
    onError: (err: any) => {
      setError(err.message || "Failed to create team");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!authReady) {
      setError("Authenticating… please wait");
      return;
    }
    createTeam({ name: teamName });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Your Team</CardTitle>
          <CardDescription>Set up your workspace to start managing your business</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                placeholder="Ex: Acme Corp"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                autoFocus
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={isPending || !teamName || !authReady}>
              {isPending ? "Creating..." : "Create Team"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
