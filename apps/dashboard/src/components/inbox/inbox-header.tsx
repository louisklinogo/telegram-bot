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

interface InboxHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  platformFilter: "all" | "whatsapp" | "instagram";
  onPlatformFilterChange: (filter: "all" | "whatsapp" | "instagram") => void;
}

export function InboxHeader({
  searchQuery,
  onSearchChange,
  platformFilter,
  onPlatformFilterChange,
}: InboxHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b p-4">
      <div className="flex items-center gap-2 flex-1">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={platformFilter}
          onValueChange={(value) =>
            onPlatformFilterChange(value as "all" | "whatsapp" | "instagram")
          }
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

      <Link href="/inbox/settings">
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
