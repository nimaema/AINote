import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Bricolage_Grotesque } from "next/font/google";
import { AuroraBackground } from "@/components/aurora-background";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GlaciaNav Notes",
  description:
    "Record or upload audio, transcribe it, and turn it into summaries, action items, and answers.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f8fc",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${bricolage.variable}`}
    >
      <body className="min-h-[100dvh] antialiased">
        <AuroraBackground />
        {children}
      </body>
    </html>
  );
}
