"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { WhatsAppModal } from "./whatsapp-modal";

export function ConnectWhatsApp() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full transform transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
        onClick={() => setIsModalOpen(true)}
      >
        Install
      </Button>

      <WhatsAppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        inboxId="demo-inbox-id" // Replace with actual inbox ID when backend is ready
      />
    </>
  );
}
