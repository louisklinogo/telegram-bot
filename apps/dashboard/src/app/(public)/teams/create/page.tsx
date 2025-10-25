"use client";

import { Label } from "@Faworra/ui/label";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { trpc } from "@/lib/trpc/client";

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
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                autoFocus
                id="teamName"
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Ex: Acme Corp"
                required
                value={teamName}
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <Button
              className="w-full"
              disabled={isPending || !teamName || !authReady}
              type="submit"
            >
              {isPending ? "Creating..." : "Create Team"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
