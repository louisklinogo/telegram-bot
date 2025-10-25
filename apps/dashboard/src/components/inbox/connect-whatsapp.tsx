"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WhatsAppModal } from "./whatsapp-modal";

export function ConnectWhatsApp() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  const startInstall = async () => {
    setInstalling(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${base}/providers/whatsapp/baileys/session/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalId: "primary", displayName: "WhatsApp" }),
      });
      if (!res.ok) throw new Error("Failed");
      setIsModalOpen(true);
    } catch (e) {
      console.error(e);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <>
      <Button
        className="w-full transform transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
        disabled={installing}
        onClick={startInstall}
        size="sm"
        variant="outline"
      >
        {installing ? "Installing..." : "Install"}
      </Button>

      <WhatsAppModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
