"use client";
import type { clients } from "@cimantikos/database/schema";
import { Button } from "@cimantikos/ui/button";
import { Card, CardContent, CardHeader } from "@cimantikos/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@cimantikos/ui/dropdown-menu";
import type { InferSelectModel } from "drizzle-orm";
import { Mail, MessageCircle, MoreVertical, Phone } from "lucide-react";

type Client = InferSelectModel<typeof clients>;

interface ClientCardProps {
  client: Client;
}

export function ClientCard({ client }: ClientCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <h3 className="font-semibold text-lg">{client.name}</h3>
          {client.referralSource && (
            <p className="text-xs text-muted-foreground">via {client.referralSource}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>View Orders</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono">{client.whatsapp}</span>
        </div>
        {client.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono">{client.phone}</span>
          </div>
        )}
        {client.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{client.email}</span>
          </div>
        )}
        {client.notes && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{client.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
