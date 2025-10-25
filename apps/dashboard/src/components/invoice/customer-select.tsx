"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface CustomerSelectProps {
  value?: string | null;
  onSelect: (customerId: string, customerName: string) => void;
}

export function CustomerSelect({ value, onSelect }: CustomerSelectProps) {
  const [open, setOpen] = useState(false);

  const { data: rawClients = [] } = trpc.clients.list.useQuery({ limit: 100 });

  const clients = Array.isArray(rawClients)
    ? rawClients.map((client: any) => ({
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
      }))
    : [];

  const selectedClient = clients.find((client: any) => client.id === value);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="w-full justify-between"
          role="combobox"
          variant="outline"
        >
          {selectedClient?.name || "Select customer..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search customers..." />
          <CommandEmpty>No customer found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {clients.map((client: any) => (
                <CommandItem
                  key={client.id}
                  onSelect={() => {
                    onSelect(client.id, client.name);
                    setOpen(false);
                  }}
                  value={client.name}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{client.name}</span>
                    {client.email && (
                      <span className="text-muted-foreground text-xs">{client.email}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
