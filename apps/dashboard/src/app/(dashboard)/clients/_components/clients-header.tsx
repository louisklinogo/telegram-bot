import { Button } from "@Faworra/ui/button";
import { Plus } from "lucide-react";
import { CreateClientDialog } from "./create-client-dialog";

export function ClientsHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-balance font-bold text-3xl tracking-tight">Clients</h1>
        <p className="text-muted-foreground">Manage your clients and their information</p>
      </div>
      <CreateClientDialog>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </CreateClientDialog>
    </div>
  );
}
