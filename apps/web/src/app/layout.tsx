import "@/styles/lattern.css";
import "@/styles/site-navigation.css";
import "@/styles/loading.css";
import { SiteNavigation } from "@/components/organisms/site-navigation";
import { SmoothPageScroll } from "@/components/smooth-page-scroll";
import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Syne } from "next/font/google";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Lantern Finance — Illuminate the agent economy",
  description:
    "A live graph of liquidity, sold to solver agents, and a market where their signed route quotes stream in — you pick one, only that route settles onchain, and the fill earns its solver a soulbound record. Built on Avalanche Fuji.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${syne.variable} ${jetbrainsMono.variable} no-js dark h-full antialiased`}
    >
      <body>
        <Providers>
          <SmoothPageScroll />
          <SiteNavigation />
          {children}
        </Providers>
      </body>
    </html>
  );
}
