import type { Metadata, Viewport } from "next";

import "./globals.css";
import { PolycorpPreviewBridge } from "@/components/polycorp-preview-bridge";

export const metadata: Metadata = {
  title: "Website",
  description: "A website built with Polycorp.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-svh font-sans antialiased">
        {children}
        <PolycorpPreviewBridge />
      </body>
    </html>
  );
}
