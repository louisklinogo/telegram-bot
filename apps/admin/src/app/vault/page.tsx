"use client";

import { VaultHeader } from "@/components/vault-header";
import { VaultView } from "@/components/vault-view";

export default function VaultPage() {
  return (
    <div className="px-6">
      <VaultHeader />
      <VaultView />
    </div>
  );
}
