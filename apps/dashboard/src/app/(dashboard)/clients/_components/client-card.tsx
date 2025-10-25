"use client";
import type { clients } from "@Faworra/database/schema";
import { Button } from "@Faworra/ui/button";
import { Card, CardContent, CardHeader } from "@Faworra/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@Faworra/ui/dropdown-menu";
// Use $inferSelect to avoid cross-package drizzle type identity issues
import { Mail, MessageCircle, MoreVertical, Phone } from "lucide-react";

type Client = typeof clients.$inferSelect;

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
            <p className="text-muted-foreground text-xs">via {client.referralSource}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8 w-8" size="icon" variant="ghost">
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
          <p className="mt-2 line-clamp-2 text-muted-foreground text-xs">{client.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
