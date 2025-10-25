import { Search, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KeyboardShortcutsHelp } from "./keyboard-shortcuts-help";

interface InboxHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  platformFilter: "all" | "whatsapp" | "instagram";
  onPlatformFilterChange: (filter: "all" | "whatsapp" | "instagram") => void;
  statusFilter: "open" | "pending" | "resolved" | "snoozed";
  onStatusFilterChange: (status: "open" | "pending" | "resolved" | "snoozed") => void;
}

export function InboxHeader({
  searchQuery,
  onSearchChange,
  platformFilter,
  onPlatformFilterChange,
  statusFilter,
  onStatusFilterChange,
}: InboxHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b p-4">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative max-w-md flex-1">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search messages..."
            value={searchQuery}
          />
        </div>

        <Select
          onValueChange={(value) =>
            onStatusFilterChange(value as "open" | "pending" | "resolved" | "snoozed")
          }
          value={statusFilter}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="snoozed">Snoozed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) =>
            onPlatformFilterChange(value as "all" | "whatsapp" | "instagram")
          }
          value={platformFilter}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <KeyboardShortcutsHelp />
        <Link href="/inbox/settings">
          <Button size="icon" variant="outline">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
