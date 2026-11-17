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
  title: "Lattern — Illuminate the agent economy",
  description:
    "Identity, soulbound reputation and a lumen score for every agent — verify before you sign. Sign once, and your agent runs the corridor under an immutable onchain policy. Built on Avalanche Fuji.",
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
