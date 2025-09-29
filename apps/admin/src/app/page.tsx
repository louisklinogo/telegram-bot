import { ArrowUpRight, Download, Filter, Plus, Search } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const overviewMetrics = [
  {
    label: "Active Orders",
    value: "12",
    change: "+3 this week",
  },
  {
    label: "Outstanding Invoices",
    value: "₵18,420",
    change: "4 awaiting payment",
  },
  {
    label: "Customer Updates",
    value: "7",
    change: "New measurements logged",
  },
  {
    label: "Files Received",
    value: "15",
    change: "Since Monday",
  },
];

const recentOrders = [
  {
    client: "Adwoa Mensah",
    orderId: "ORD-2381",
    total: "₵1,580",
    status: "In progress",
  },
  {
    client: "Kofi Owusu",
    orderId: "ORD-2379",
    total: "₵980",
    status: "Awaiting measurements",
  },
  {
    client: "Ama Boateng",
    orderId: "ORD-2375",
    total: "₵2,430",
    status: "Ready for pickup",
  },
];

const upcomingMeasurements = [
  {
    client: "Yaw Antwi",
    date: "Today • 3:00 PM",
    notes: "Wedding suit fitting",
  },
  {
    client: "Dede Agyeman",
    date: "Tomorrow • 10:30 AM",
    notes: "New client onboarding",
  },
  {
    client: "Kwesi Nartey",
    date: "Fri • 1:00 PM",
    notes: "Adjust trouser length",
  },
];

export default function DashboardPage() {
  const headerActions = (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 rounded-md border px-3 py-1.5 text-sm md:flex">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients, orders, invoices..."
          className="h-6 border-none bg-transparent p-0 text-sm focus-visible:ring-0"
        />
      </div>
      <Button variant="outline" size="sm" className="gap-2">
        <Filter className="h-4 w-4" /> Filters
      </Button>
      <Button size="sm" className="gap-2">
        <Plus className="h-4 w-4" /> New Entry
      </Button>
    </div>
  );

  return (
    <PageShell
      title="Dashboard"
      description="Real-time visibility into orders, invoices, and measurement activity."
      headerActions={headerActions}
      className="flex flex-col gap-6"
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewMetrics.map((metric) => (
          <Card key={metric.label} className="border-muted">
            <CardHeader className="space-y-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <span className="text-2xl font-semibold tracking-tight">{metric.value}</span>
              <Badge variant="outline" className="gap-1 text-xs">
                <ArrowUpRight className="h-3 w-3" />
                {metric.change}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-muted">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track progress on active tailoring work.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentOrders.map((order, index) => (
              <div key={order.orderId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium leading-none">{order.client}</p>
                    <p className="text-xs text-muted-foreground">{order.orderId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tracking-tight">{order.total}</p>
                    <p className="text-xs text-muted-foreground">{order.status}</p>
                  </div>
                </div>
                {index !== recentOrders.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Measurement Schedule</CardTitle>
            <p className="text-sm text-muted-foreground">
              Upcoming fittings and measurement sessions.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingMeasurements.map((booking, index) => (
              <div key={booking.client} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium leading-none">{booking.client}</p>
                    <p className="text-xs text-muted-foreground">{booking.date}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {booking.notes}
                  </Badge>
                </div>
                {index !== upcomingMeasurements.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
