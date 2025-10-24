"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function ChannelConnectButton({ onClick }: { onClick: () => void }) {
  const [isLoading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    onClick();
    setTimeout(() => setLoading(false), 3000);
  };

  return (
    <Button variant="outline" disabled={isLoading} onClick={handleClick}>
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect"}
    </Button>
  );
}
