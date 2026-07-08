import type { Metadata, Viewport } from "next";
import { Libre_Caslon_Text, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { Pwa } from "@/components/pwa";
import "./globals.css";

// ARCHITECTURAL LIGHT type system:
//  - Libre Caslon Text → editorial serif voice (headlines, wordmark, brief)
//  - Hanken Grotesk    → the Swiss sans workhorse (UI + body)
//  - IBM Plex Mono     → machine truth (timers, coordinates, speaker tags)
const caslon = Libre_Caslon_Text({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-caslon",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "GlaciaNav Notes",
  title: "GlaciaNav Notes",
  description:
    "Record a conversation and get a clean summary, decisions, and action items. Every note stays traceable to the moment it was said.",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Notes",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f8f8f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${caslon.variable} ${hanken.variable} ${plexMono.variable}`}
    >
      <body className="min-h-[100dvh] antialiased">
        {children}
        <Pwa />
      </body>
    </html>
  );
}
