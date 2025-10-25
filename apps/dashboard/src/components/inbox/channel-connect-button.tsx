"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ChannelConnectButton({ onClick }: { onClick: () => void }) {
  const [isLoading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    onClick();
    setTimeout(() => setLoading(false), 3000);
  };

  return (
    <Button disabled={isLoading} onClick={handleClick} variant="outline">
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
    </Button>
  );
}
