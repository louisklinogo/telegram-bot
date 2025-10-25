"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc/client";

type User = {
  id: string;
  avatarUrl?: string | null;
  fullName?: string | null;
  email?: string;
};

type Props = {
  onSelect: (selected: User) => void;
};

function AssignedUser({
  avatarUrl,
  fullName,
  email,
}: {
  avatarUrl?: string | null;
  fullName?: string | null;
  email?: string;
}) {
  const initials = fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : (email?.[0]?.toUpperCase() ?? "?");

  return (
    <div className="flex items-center space-x-2">
      <Avatar className="h-6 w-6">
        <AvatarImage alt={fullName ?? email ?? ""} src={avatarUrl ?? undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <span className="text-sm">{fullName ?? email ?? "Unknown"}</span>
    </div>
  );
}

export function SelectUser({ onSelect }: Props) {
  const { data: members, isLoading } = trpc.transactions.members.useQuery();

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {members?.map((member: any) => (
        <button
          className="flex w-full cursor-pointer items-center rounded-sm p-2 text-sm hover:bg-accent"
          key={member.id}
          onClick={() => {
            onSelect({
              id: member.id,
              avatarUrl: member.avatarUrl,
              fullName: member.fullName,
              email: member.email,
            });
          }}
          type="button"
        >
          <AssignedUser
            avatarUrl={member.avatarUrl}
            email={member.email}
            fullName={member.fullName}
          />
        </button>
      ))}
      {(!members || members.length === 0) && (
        <p className="px-2 text-muted-foreground text-sm">No members found</p>
      )}
    </div>
  );
}
