"use client";

import { useState } from "react";
import { createBrowserClient } from "@cimantikos/supabase/client";
import { createUserInvite } from "@cimantikos/supabase/mutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import { useQuery } from "@tanstack/react-query";

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
        placeholder="Emails, comma separated"
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={sendInvites} disabled={sending || !emails.trim()}>
          Invite
        </Button>
        {result && <span className="text-xs text-muted-foreground">{result}</span>}
      </div>
    </div>
  );
}
