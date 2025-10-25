"use client";

import { ChannelConnectButton } from "./channel-connect-button";

type Props = {
  id: string;
  provider: "whatsapp-baileys" | "whatsapp-cloud" | "instagram" | "gmail";
  openWhatsApp: () => void;
  openInstagram: () => void;
};

export function ConnectChannelProvider({ id: _id, provider, openWhatsApp, openInstagram }: Props) {
  switch (provider) {
    case "whatsapp-baileys":
      return <ChannelConnectButton onClick={openWhatsApp} />;
    case "instagram":
      return <ChannelConnectButton onClick={openInstagram} />;
    case "whatsapp-cloud":
    case "gmail":
    default:
      return <ChannelConnectButton onClick={() => {}} />;
  }
}
