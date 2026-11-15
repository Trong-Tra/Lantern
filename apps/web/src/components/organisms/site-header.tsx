import Link from "next/link";
import { LatternMark } from "@/components/icons/lattern-mark";
import { ConnectWalletButton } from "@/containers/lattern/components/connect-wallet-button";

export function SiteHeader() {
  return (
    <header className="lattern-header">
      <Link href="/" className="lattern-wordmark no-underline" aria-label="Lattern — home">
        <LatternMark />
        <span>LATTERN</span>
      </Link>
      <ConnectWalletButton />
    </header>
  );
}
