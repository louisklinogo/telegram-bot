"use client";

import { EnvelopeSimple, type IconProps, InstagramLogo, WhatsappLogo } from "phosphor-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc/client";
import { DisconnectChannelSheet } from "./disconnect-channel-sheet";

interface Account {
  id: string;
  provider: string;
  externalId: string;
  displayName: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Props {
  initialAccounts: Account[];
}

interface ProviderConfig {
  name: string;
  icon: React.ComponentType<IconProps>;
}

const PROVIDER_CONFIG: Record<string, ProviderConfig> = {
  whatsapp_baileys: {
    name: "WhatsApp (Baileys)",
    icon: WhatsappLogo,
  },
  whatsapp_twilio: {
    name: "WhatsApp (Twilio)",
    icon: WhatsappLogo,
  },
  whatsapp_meta: {
    name: "WhatsApp Cloud API",
    icon: WhatsappLogo,
  },
  instagram_meta: {
    name: "Instagram",
    icon: InstagramLogo,
  },
  gmail: {
    name: "Gmail",
    icon: EnvelopeSimple,
  },
};

export function ConnectedChannelsTable({ initialAccounts }: Props) {
  const [disconnectId, setDisconnectId] = useState<string | null>(null);
  const [disconnectProvider, setDisconnectProvider] = useState<string>("");
  const utils = trpc.useUtils();

  const { data: accounts = initialAccounts } = trpc.communications.accounts.useQuery(undefined, {
    initialData: initialAccounts,
  });

  const disconnect = trpc.communications.disconnect.useMutation({
    onSuccess: async () => {
      setDisconnectId(null);
      await utils.communications.accounts.invalidate();
    },
  });

  const reconnect = trpc.communications.reconnect.useMutation({
    onSuccess: async () => {
      await utils.communications.accounts.invalidate();
    },
  });

  if (accounts.length === 0) {
    return (
      <Card className="border-0">
        <CardContent className="pt-12 pb-12">
          <div className="text-center">
            <div className="mb-4 text-muted-foreground text-sm">No channels connected yet</div>
            <Button asChild>
              <a href="/inbox">Connect a channel</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    connected: "default",
    disconnected: "secondary",
    error: "destructive",
  };

  return (
    <>
      <Card className="border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Connected Channels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead>Identity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Connected</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => {
                  const config = PROVIDER_CONFIG[account.provider];
                  const Icon = config?.icon;
                  const displayLabel = account.displayName || account.externalId;

                  return (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {Icon && <Icon size={20} weight="duotone" />}
                          <span className="font-medium text-sm">
                            {config?.name || account.provider}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">{displayLabel}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[account.status] || "secondary"}>
                          {account.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-xs">
                          {new Date(account.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-label="Actions" size="icon" variant="ghost">
                              <Icons.MoreHoriz className="size-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={reconnect.isPending}
                              onClick={() => {
                                reconnect.mutate({ accountId: account.id });
                              }}
                            >
                              Reconnect
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setDisconnectId(account.id);
                                setDisconnectProvider(config?.name || account.provider);
                              }}
                            >
                              Disconnect
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <DisconnectChannelSheet
        isLoading={disconnect.isPending}
        onConfirm={async () => {
          if (disconnectId) {
            await disconnect.mutateAsync({ accountId: disconnectId });
          }
        }}
        onOpenChange={(open) => {
          if (!open) setDisconnectId(null);
        }}
        open={disconnectId !== null}
        provider={disconnectProvider}
      />
    </>
  );
}
