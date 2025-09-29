import { Plus } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const clients = [
  {
    name: "Adwoa Mensah",
    phone: "+233 24 123 4567",
    orders: 5,
    lastOrder: "2 days ago",
  },
  {
    name: "Kwesi Nartey",
    phone: "+233 20 441 8801",
    orders: 3,
    lastOrder: "1 week ago",
  },
  {
    name: "Ama Boateng",
    phone: "+233 27 908 5522",
    orders: 8,
    lastOrder: "Today",
  },
];

export default function ClientsPage() {
  return (
    <PageShell
      title="Clients"
      description="Maintain customer relationships and quickly review order history."
      headerActions={
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      }
      className="space-y-4"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Orders</TableHead>
            <TableHead className="text-right">Last order</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.name}>
              <TableCell className="font-medium">{client.name}</TableCell>
              <TableCell>{client.phone}</TableCell>
              <TableCell>{client.orders}</TableCell>
              <TableCell className="text-right">{client.lastOrder}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageShell>
  );
}
