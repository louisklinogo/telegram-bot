"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { InstagramLogo } from "@/components/inbox/assets/instagram-logo";
import { WhatsAppLogo } from "@/components/inbox/assets/whatsapp-logo";
import { ChannelDetailsSheet } from "@/components/inbox/channel-details-sheet";
import { ConnectInstagram } from "@/components/inbox/connect-instagram";
import { ConnectWhatsApp } from "@/components/inbox/connect-whatsapp";
import { Button } from "@/components/ui/button";

export default function InboxSettingsPage() {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  const channels = [
    {
      id: "whatsapp",
      name: "WhatsApp Business",
      description: "Receive photos, measurements, and inquiries from customers via WhatsApp",
      category: "Messaging",
      logo: WhatsAppLogo,
      installed: false, // Default: not connected
      active: true,
      ConnectButton: ConnectWhatsApp,
    },
    {
      id: "instagram",
      name: "Instagram Direct",
      description: "Connect with fashion-conscious customers through Instagram Direct Messages",
      category: "Social Media",
      logo: InstagramLogo,
      installed: false, // Default: not connected
      active: true,
      ConnectButton: ConnectInstagram,
    },
  ];

  const selectedChannelData = channels.find((c) => c.id === selectedChannel);

  return (
    <div className="mt-4 px-6">
      <div className="mb-8">
        <Link href="/inbox">
          <Button variant="ghost" size="icon" className="mb-4">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-medium mb-1">Communication Channels</h1>
        <p className="text-sm text-[#878787]">
          Connect and manage your WhatsApp and Instagram accounts to receive customer messages
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {channels.map((channel) => (
          <InboxChannelCard
            key={channel.id}
            id={channel.id}
            name={channel.name}
            description={channel.description}
            category={channel.category}
            logo={channel.logo}
            installed={channel.installed}
            active={channel.active}
            ConnectButton={channel.ConnectButton}
            onDetailsClick={() => setSelectedChannel(channel.id)}
            onDisconnect={() => {
              // TODO: Implement disconnect logic
              console.log("Disconnecting", channel.id);
            }}
          />
        ))}
      </div>

      {selectedChannelData && (
        <ChannelDetailsSheet
          open={selectedChannel !== null}
          onOpenChange={(open) => !open && setSelectedChannel(null)}
          channel={selectedChannelData}
          onInstall={() => {
            // TODO: Implement install logic - open modal or OAuth flow
            console.log("Installing", selectedChannelData.id);
          }}
          onDisconnect={() => {
            // TODO: Implement disconnect logic
            console.log("Disconnecting", selectedChannelData.id);
          }}
        />
      )}
    </div>
  );
}

function InboxChannelCard({
  id: _id,
  logo: Logo,
  name,
  description,
  category: _category,
  installed,
  active,
  ConnectButton,
  onDetailsClick,
  onDisconnect,
}: {
  id: string;
  logo: React.ComponentType;
  name: string;
  description: string;
  category: string;
  installed?: boolean;
  active?: boolean;
  ConnectButton: React.ComponentType;
  onDetailsClick: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="border rounded-lg w-full flex flex-col hover:border-border transition-colors">
      <div className="pt-6 px-6 h-16 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          {installed && (
            <div className="text-green-600 bg-green-100 text-[10px] dark:bg-green-900 dark:text-green-300 px-3 py-1 rounded-full font-mono">
              Installed
            </div>
          )}
        </div>
      </div>

      <div className="px-6 pb-0 pt-4">
        <div className="flex items-center space-x-2 pb-4">
          <h3 className="text-md font-medium leading-none">{name}</h3>
          {!active && (
            <span className="text-[#878787] bg-[#F2F1EF] text-[10px] dark:bg-[#1D1D1D] px-3 py-1 rounded-full font-mono">
              Coming soon
            </span>
          )}
        </div>
      </div>

      <div className="px-6 text-xs text-[#878787] pb-4 min-h-[60px] pt-0">{description}</div>

      <div className="px-6 pb-6 mt-auto flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={!active}
          onClick={onDetailsClick}
        >
          Details
        </Button>

        {installed ? (
          <Button variant="outline" size="sm" className="w-full" onClick={onDisconnect}>
            Disconnect
          </Button>
        ) : (
          <ConnectButton />
        )}
      </div>
    </div>
  );
}
