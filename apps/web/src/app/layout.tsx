import type { Metadata } from "next";
import { bodyFont, displayFont } from "./fonts";
import "./globals.css";
import { PaletteSwitcher } from "@/components/theme/palette-switcher";
import { AppToaster } from "@/components/ui/toaster";
import { AppProviders } from "@/providers/app-providers";
import { SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Forge",
  description: "Build and ship branded pages with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light-warm"
      className={`theme-light-warm ${displayFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="font-body min-h-full flex flex-col bg-bg text-text">
        <AppProviders>
          {children}
          <PaletteSwitcher />
          <AppToaster />
        </AppProviders>
      </body>
    </html>
  );
}
