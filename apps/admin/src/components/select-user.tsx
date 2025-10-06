"use client";

import { trpc } from "@/lib/trpc/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";

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
  email 
}: { 
  avatarUrl?: string | null; 
  fullName?: string | null;
  email?: string;
}) {
  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase()
    : email?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="flex items-center space-x-2">
      <Avatar className="h-6 w-6">
        <AvatarImage src={avatarUrl ?? undefined} alt={fullName ?? email ?? ''} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <span className="text-sm">{fullName ?? email ?? 'Unknown'}</span>
    </div>
  );
}

export function SelectUser({ onSelect }: Props) {
  const { data: members, isLoading } = trpc.transactions.members.useQuery();

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {members?.map((member: any) => (
        <button
          type="button"
          key={member.id}
          className="flex items-center text-sm cursor-pointer hover:bg-accent w-full p-2 rounded-sm"
          onClick={() => {
            onSelect({
              id: member.id,
              avatarUrl: member.avatarUrl,
              fullName: member.fullName,
              email: member.email,
            });
          }}
        >
          <AssignedUser 
            avatarUrl={member.avatarUrl} 
            fullName={member.fullName}
            email={member.email}
          />
        </button>
      ))}
      {(!members || members.length === 0) && (
        <p className="text-sm text-muted-foreground px-2">No members found</p>
      )}
    </div>
  );
}
