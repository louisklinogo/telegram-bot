"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InstagramModal } from "./instagram-modal";

export function ConnectInstagram() {
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

      <InstagramModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
