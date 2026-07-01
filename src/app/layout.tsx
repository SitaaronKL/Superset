import type { Metadata, Viewport } from "next";
import { Anton, IBM_Plex_Mono, Hanken_Grotesk } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import "./globals.css";
import { Providers } from "./providers";

const display = Anton({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  subsets: ["latin"],
});

// Refined grotesque for UI/labels, softer & more native than the mono body,
// while mono stays reserved for numeric data (weights/reps).
const sans = Hanken_Grotesk({
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Superset",
  description: "No excuses. Log, lift, progress.",
  manifest: "/manifest.json",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "black", title: "Superset" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" className={`${display.variable} ${mono.variable} ${sans.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col">
          <Providers>{children}</Providers>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
