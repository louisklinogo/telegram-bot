"use client";

import { useMemo, useState, type ComponentType } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { WhatsappLogo, InstagramLogo as PhInstagramLogo, EnvelopeSimple, Info } from "phosphor-react";
import { InstagramModal } from "./instagram-modal";
import { WhatsAppModal } from "./whatsapp-modal";
import { ConnectChannelProvider } from "./connect-channel-provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChannelDetailsSheet } from "./channel-details-sheet";
import { startBaileysSessionAction } from "@/actions/providers/start-baileys-session";

type ConnectChannelsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Provider = {
  id: "whatsapp-baileys" | "whatsapp-cloud" | "instagram" | "gmail";
  name: string;
  description: string;
  Logo: ComponentType<{ size?: number; className?: string; weight?: any }>;
  action: () => Promise<void> | void;
  disabled?: boolean;
  iconSize?: number;
};

export function ConnectChannelsModal({ open, onOpenChange }: ConnectChannelsModalProps) {
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsChannel, setDetailsChannel] = useState<{
    id: string;
    name: string;
    logo: React.ComponentType;
    category: string;
    description: string;
    installed: boolean;
    active: boolean;
  } | null>(null);

  const startBaileysInstall = async () => {
    setBusyId("whatsapp-baileys");
    try {
      await startBaileysSessionAction();
      onOpenChange(false);
      setShowWhatsAppModal(true);
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  };

  const providers: Provider[] = [
    {
      id: "whatsapp-baileys",
      name: "WhatsApp (Baileys)",
      description: "Pair your phone via QR (Baileys). Self-hosted session for sending and receiving messages.",
      Logo: WhatsappLogo,
      action: startBaileysInstall,
      iconSize: 20,
    },
    {
      id: "whatsapp-cloud",
      name: "WhatsApp Cloud API",
      description: "Official Meta Cloud API. No phone pairing; uses app tokens. Stable and scalable.",
      Logo: WhatsappLogo,
      action: () => {},
      disabled: true, // placeholder
      iconSize: 20,
    },
    {
      id: "instagram",
      name: "Instagram Direct",
      description: "Connect your Instagram Business account to send and receive Direct Messages.",
      Logo: PhInstagramLogo,
      action: () => {
        onOpenChange(false);
        setShowInstagramModal(true);
      },
      iconSize: 20,
    },
    {
      id: "gmail",
      name: "Email (Gmail)",
      description: "Ingest customer emails from Gmail into your unified inbox (read-only).",
      Logo: EnvelopeSimple,
      action: () => {},
      disabled: true, // placeholder for future OAuth
      iconSize: 20,
    },
  ];

  const filtered = useMemo(
    () =>
      providers.filter((p) =>
        (p.name + " " + p.description).toLowerCase().includes(query.toLowerCase()),
      ),
    [providers, query],
  );

  const openDetails = (prov: Provider) => {
    const category = prov.id === "gmail" ? "Email" : "Messaging";
    const LogoComp = prov.Logo as unknown as React.ComponentType;
    setDetailsChannel({
      id: prov.id,
      name: prov.name,
      logo: LogoComp,
      category,
      description: prov.description,
      installed: false,
      active: !prov.disabled,
    });
    setDetailsOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <div className="p-4">
            <DialogHeader>
              <DialogTitle>Connect channel</DialogTitle>
              <DialogDescription>
                We support multiple providers. If you can’t find yours, start with WhatsApp Baileys.
              </DialogDescription>
            </DialogHeader>

            <div className="pt-4">
              <div className="flex space-x-2 relative">
                <Input
                  placeholder="Search provider..."
                  type="search"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div className="h-[430px] space-y-4 overflow-auto scrollbar-hide pt-2 mt-2">
                {filtered.map(({ id, name, description, Logo, action, disabled, iconSize }) => (
                  <div key={id} className="flex justify-between">
                    <div className="flex items-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 text-foreground/80">
                        <Logo size={iconSize ?? 20} weight="duotone" />
                      </span>
                      <div className="ml-4 space-y-1 cursor-default">
                        <p className="text-sm font-medium leading-none">{name}</p>
                        <span className="text-[#878787] text-xs">{description}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <ConnectChannelProvider
                        id={id}
                        provider={id as any}
                        openWhatsApp={async () => {
                          setBusyId(id);
                          await action();
                          setBusyId(null);
                        }}
                        openInstagram={() => {
                          setBusyId(id);
                          action();
                          setBusyId(null);
                        }}
                      />

                      <TooltipProvider delayDuration={70}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="rounded-full w-7 h-7"
                              onClick={() => openDetails({ id, name, description, Logo, action, disabled, iconSize })}
                            >
                              <Info size={16} weight="duotone" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="px-3 py-1.5 text-xs" sideOffset={10}>
                            Learn more
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}

                {filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center min-h-[350px]">
                    <p className="font-medium mb-2">No providers found</p>
                    <p className="text-sm text-center text-[#878787]">
                      We couldn't find a provider matching your criteria.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <WhatsAppModal isOpen={showWhatsAppModal} onClose={() => setShowWhatsAppModal(false)} />
      <InstagramModal isOpen={showInstagramModal} onClose={() => setShowInstagramModal(false)} />
      {detailsChannel && (
        <ChannelDetailsSheet
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          channel={detailsChannel}
          onInstall={() => {
            if (detailsChannel?.id === "whatsapp-baileys") {
              // Trigger the same Baileys connect flow used by the list "Connect" button
              startBaileysInstall();
            } else if (detailsChannel?.id === "instagram") {
              onOpenChange(false);
              setShowInstagramModal(true);
            } else {
              setDetailsOpen(false);
            }
          }}
          onDisconnect={() => setDetailsOpen(false)}
        />
      )}
    </>
  );
}
