import Link from "next/link";
import { LatternMark } from "@/components/icons/lattern-mark";
import { ConnectWalletButton } from "@/containers/lattern/components/connect-wallet-button";

export type SiteTab = "home" | "network" | "docs";

const TABS: { id: SiteTab; href: string; label: string }[] = [
  { id: "home", href: "/", label: "Home" },
  { id: "network", href: "/network", label: "Network" },
  { id: "docs", href: "/docs", label: "Docs" },
];

/**
 * Shared header for app pages (/network, /agent/[id], /docs) — the same
 * visual language as the landing header (lattern.css), with route links
 * instead of cinematic scroll jumps. The active tab carries
 * aria-current="page" and gets the lantern color from lattern.css.
 * Pages using it need top padding for the fixed 112px header.
 */
export function SiteHeader({ active }: { active: SiteTab }) {
  return (
    <header className="lattern-header">
      <Link href="/" className="lattern-wordmark no-underline" aria-label="Lattern — home">
        <LatternMark />
        <span>LATTERN</span>
      </Link>
      <nav className="lattern-top-nav" aria-label="Main navigation">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active === tab.id ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <ConnectWalletButton />
    </header>
  );
}
