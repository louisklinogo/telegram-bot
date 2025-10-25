"use client";

import {
  EnvelopeSimple,
  Info,
  InstagramLogo as PhInstagramLogo,
  WhatsappLogo,
} from "phosphor-react";
import { type ComponentType, useMemo, useState } from "react";
import { startBaileysSessionAction } from "@/actions/providers/start-baileys-session";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChannelDetailsSheet } from "./channel-details-sheet";
import { ConnectChannelProvider } from "./connect-channel-provider";
import { InstagramModal } from "./instagram-modal";
import { WhatsAppModal } from "./whatsapp-modal";

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
      description:
        "Pair your phone via QR (Baileys). Self-hosted session for sending and receiving messages.",
      Logo: WhatsappLogo,
      action: startBaileysInstall,
      iconSize: 20,
    },
    {
      id: "whatsapp-cloud",
      name: "WhatsApp Cloud API",
      description:
        "Official Meta Cloud API. No phone pairing; uses app tokens. Stable and scalable.",
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
        (p.name + " " + p.description).toLowerCase().includes(query.toLowerCase())
      ),
    [providers, query]
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
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent className="sm:max-w-2xl">
          <div className="p-4">
            <DialogHeader>
              <DialogTitle>Connect channel</DialogTitle>
              <DialogDescription>
                We support multiple providers. If you can’t find yours, start with WhatsApp Baileys.
              </DialogDescription>
            </DialogHeader>

            <div className="pt-4">
              <div className="relative flex space-x-2">
                <Input
                  autoComplete="off"
                  autoCorrect="off"
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search provider..."
                  spellCheck={false}
                  type="search"
                  value={query}
                />
              </div>

              <div className="scrollbar-hide mt-2 h-[430px] space-y-4 overflow-auto pt-2">
                {filtered.map(({ id, name, description, Logo, action, disabled, iconSize }) => (
                  <div className="flex justify-between" key={id}>
                    <div className="flex items-center">
                      <span className="inline-flex h-6 w-6 items-center justify-center text-foreground/80">
                        <Logo size={iconSize ?? 20} weight="duotone" />
                      </span>
                      <div className="ml-4 cursor-default space-y-1">
                        <p className="font-medium text-sm leading-none">{name}</p>
                        <span className="text-[#878787] text-xs">{description}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <ConnectChannelProvider
                        id={id}
                        openInstagram={() => {
                          setBusyId(id);
                          action();
                          setBusyId(null);
                        }}
                        openWhatsApp={async () => {
                          setBusyId(id);
                          await action();
                          setBusyId(null);
                        }}
                        provider={id as any}
                      />

                      <TooltipProvider delayDuration={70}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              className="h-7 w-7 rounded-full"
                              onClick={() =>
                                openDetails({
                                  id,
                                  name,
                                  description,
                                  Logo,
                                  action,
                                  disabled,
                                  iconSize,
                                })
                              }
                              size="icon"
                              variant="outline"
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
                  <div className="flex min-h-[350px] flex-col items-center justify-center">
                    <p className="mb-2 font-medium">No providers found</p>
                    <p className="text-center text-[#878787] text-sm">
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
          channel={detailsChannel}
          onDisconnect={() => setDetailsOpen(false)}
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
          onOpenChange={setDetailsOpen}
          open={detailsOpen}
        />
      )}
    </>
  );
}
