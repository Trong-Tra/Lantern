import Link from "next/link";
import { LatternMark } from "@/components/icons/lattern-mark";
import { ConnectWalletButton } from "@/containers/lattern/components/connect-wallet-button";

/**
 * Shared header for app pages (/explore, /agent/[id], /docs) — the same
 * visual language as the landing header (lattern.css), but with route links
 * instead of cinematic scroll jumps. Pages using it need top padding for
 * the fixed 112px header.
 */
export function SiteHeader() {
  return (
    <header className="lattern-header">
      <Link
        href="/"
        className="lattern-wordmark no-underline"
        aria-label="Lattern — home"
      >
        <LatternMark />
        <span>LATTERN</span>
      </Link>
      <nav className="lattern-top-nav" aria-label="Main navigation">
        <Link href="/">Home</Link>
        <Link href="/explore">Network</Link>
      </nav>
      <ConnectWalletButton />
    </header>
  );
}
