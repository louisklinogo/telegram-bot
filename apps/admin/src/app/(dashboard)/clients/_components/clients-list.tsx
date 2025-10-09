"use client";

import { Card } from "@cimantikos/ui/card";
import { Input } from "@cimantikos/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { ClientCard } from "./client-card";
export function ClientsList() {
  const [search, setSearch] = useState("");
  const [data] = trpc.clients.list.useSuspenseQuery({
    search: search || undefined,
  });

  // Handle new API shape that returns { items, nextCursor }
  const clients = Array.isArray(data) ? data : (data?.items ?? []);

  const filteredClients = search
    ? clients.filter(
        (client: any) =>
          client.name.toLowerCase().includes(search.toLowerCase()) ||
          client.email?.toLowerCase().includes(search.toLowerCase()) ||
          client.phone?.includes(search) ||
          client.whatsapp.includes(search),
      )
    : clients;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {filteredClients.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {search
              ? "No clients found matching your search"
              : "No clients yet. Add your first client to get started."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client: any) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}
