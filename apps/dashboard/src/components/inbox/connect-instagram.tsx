"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InstagramModal } from "./instagram-modal";

export function ConnectInstagram() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        className="w-full transform transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
        onClick={() => setIsModalOpen(true)}
        size="sm"
        variant="outline"
      >
        Install
      </Button>

      <InstagramModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
