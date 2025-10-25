"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WhatsAppModal } from "./whatsapp-modal";

export function ManageWhatsApp() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const openOrStart = async () => {
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      await fetch(`${base}/providers/whatsapp/baileys/session/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalId: "primary", displayName: "WhatsApp" }),
      }).catch(() => {});
      setIsModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button disabled={loading} onClick={openOrStart} size="sm" variant="outline">
        {loading ? "Opening…" : "Manage WhatsApp"}
      </Button>
      <WhatsAppModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
