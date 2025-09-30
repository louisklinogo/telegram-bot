import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/sidebar/sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cimantikós Admin",
  description: "Internal operations console for Cimantikós Clothing Company",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background font-sans antialiased`}
      >
        <Providers>
          <div className="flex min-h-screen w-full">
            <Sidebar />
            <div className="flex min-h-screen flex-1 flex-col md:ml-[70px]">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
