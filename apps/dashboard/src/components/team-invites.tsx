"use client";

import { createBrowserClient } from "@Faworra/supabase/client";
import { createUserInvite } from "@Faworra/supabase/mutations";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";

export function TeamInvites() {
  const [emails, setEmails] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { data: currentTeam } = trpc.teams.current.useQuery();

  const sendInvites = async () => {
    try {
      setSending(true);
      setResult(null);
      const teamId = currentTeam?.teamId || null;
      if (!teamId) throw new Error("Select a team first");
      const supabase = createBrowserClient();
      const list = emails
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      for (const email of list) {
        await createUserInvite(supabase, { team_id: teamId, email, role: "agent" });
      }
      setResult(`Invited: ${list.length} user(s)`);
      setEmails("");
    } catch (e: any) {
      setResult(e?.message || "Failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-2">
      <Input
        onChange={(e) => setEmails(e.target.value)}
        placeholder="Emails, comma separated"
        value={emails}
      />
      <div className="flex items-center gap-2">
        <Button disabled={sending || !emails.trim()} onClick={sendInvites} size="sm">
          Invite
        </Button>
        {result && <span className="text-muted-foreground text-xs">{result}</span>}
      </div>
    </div>
  );
}
