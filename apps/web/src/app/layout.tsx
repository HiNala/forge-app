import type { Metadata } from "next";
import { bodyFont, displayFont, monoFont } from "./fonts";
import "./globals.css";
import { PaletteSwitcher } from "@/components/theme/palette-switcher";
import { AppToaster } from "@/components/ui/toaster";
import { AppProviders } from "@/providers/app-providers";
import { SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GlideDesign",
    template: "%s | GlideDesign",
  },
  description: "Glide from idea to product with an AI design tool that plans, designs, codes, and ships.",
  applicationName: "GlideDesign",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="glidedesign-light"
      className={`theme-glidedesign-light ${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} h-full antialiased`}
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
