"use client";

import { ConnectInstagram } from "./connect-instagram";
import { ConnectWhatsApp } from "./connect-whatsapp";
import { WhatsAppLogo } from "./assets/whatsapp-logo";
import { InstagramLogo } from "./assets/instagram-logo";

export function InboxGetStarted() {
  return (
    <div className="h-[calc(100vh-150px)] flex items-center justify-center px-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-2xl font-semibold mb-2">Connect Your Communication Channels</h1>
          <p className="text-sm text-[#878787]">
            Connect WhatsApp and Instagram to receive and manage customer messages in one place
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* WhatsApp Card */}
          <div className="border rounded-lg w-full flex flex-col transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5">
            <div className="pt-8 px-8 h-20 flex items-center justify-between">
              <div className="transform transition-transform duration-200 hover:scale-105">
                <WhatsAppLogo />
              </div>
            </div>

            <div className="px-8 pb-0 pt-6">
              <div className="flex items-center space-x-2 pb-4">
                <h3 className="text-lg font-medium leading-none">WhatsApp Business</h3>
              </div>
            </div>

            <div className="px-8 text-sm text-[#878787] pb-6 min-h-[70px] pt-0">
              Receive photos, measurements, and inquiries from customers via WhatsApp
            </div>

            <div className="px-8 pb-8 mt-auto">
              <ConnectWhatsApp />
            </div>
          </div>

          {/* Instagram Card */}
          <div className="border rounded-lg w-full flex flex-col transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5">
            <div className="pt-8 px-8 h-20 flex items-center justify-between">
              <div className="transform transition-transform duration-200 hover:scale-105">
                <InstagramLogo />
              </div>
            </div>

            <div className="px-8 pb-0 pt-6">
              <div className="flex items-center space-x-2 pb-4">
                <h3 className="text-lg font-medium leading-none">Instagram Direct</h3>
              </div>
            </div>

            <div className="px-8 text-sm text-[#878787] pb-6 min-h-[70px] pt-0">
              Connect with fashion-conscious customers through Instagram Direct Messages
            </div>

            <div className="px-8 pb-8 mt-auto">
              <ConnectInstagram />
            </div>
          </div>
        </div>

        <div className="text-center mt-8 text-sm text-[#878787]">
          <p>Once connected, all messages will appear in your unified inbox</p>
        </div>
      </div>
    </div>
  );
}
