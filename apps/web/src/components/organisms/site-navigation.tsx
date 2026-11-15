"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { MenuToggle } from "@/components/ui/menu-toggle";
import { LatternMark } from "@/components/icons/lattern-mark";
import { ConnectWalletButton } from "@/containers/lattern/components/connect-wallet-button";

const links = [
  { label: "Home", href: "/" },
  { label: "App", href: "/app" },
  { label: "Exchange", href: "/exchange" },
  { label: "Profile", href: "/profile" },
];
const tokens = [
  { symbol: "MON", name: "Monad" },
  { symbol: "USDC", name: "USD Coin" },
  { symbol: "ETH", name: "Ethereum" },
];

export function SiteNavigation() {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (pathname !== "/") return;
    let previousY = Math.max(0, window.scrollY);
    let frame = 0;
    let lastHidden = false;
    const header = headerRef.current;
    let headerHeight = header?.offsetHeight ?? 132;
    const observer = new ResizeObserver(() => {
      headerHeight = header?.offsetHeight ?? 132;
    });
    if (header) observer.observe(header);
    const update = () => {
      frame = 0;
      const currentY = Math.max(0, window.scrollY);
      if (Math.abs(currentY - previousY) < 12 && currentY > 0) return;
      const interacting = menuOpen || searchOpen || header?.contains(document.activeElement);
      const nextHidden = !interacting && currentY > headerHeight && currentY > previousY;
      if (nextHidden !== lastHidden) {
        setHidden(nextHidden);
        lastHidden = nextHidden;
      }
      previousY = currentY;
    };
    setHidden(false);
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [pathname, menuOpen, searchOpen]);

  const results = tokens.filter((token) => `${token.symbol} ${token.name}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <header ref={headerRef} onFocusCapture={() => setHidden(false)} className={`site-navigation${pathname === "/" ? " site-navigation-sticky" : ""}${pathname === "/" && hidden && !menuOpen && !searchOpen ? " site-navigation-hidden" : ""}`}>
      <Link prefetch={true} href="/" className="site-brand" aria-label="Lattern home">
        <span className="site-logo" aria-hidden="true">
          <LatternMark className="site-logo-flat" />
          <span className="site-logo-volume">
            {[0, 45, 90, 135].map((angle) => <span className="site-logo-rib" key={angle} style={{ transform: `rotateY(${angle}deg)` }}><LatternMark /></span>)}
            <span className="site-logo-core" />
          </span>
        </span>
        <span className="site-brand-name">LATTERN</span>
      </Link>
      <nav className="landing-navigation" aria-label="Main navigation">
        {links.map(({ label, href }) => <Link prefetch={true} key={href} href={href} aria-current={pathname === href ? "page" : undefined}><span>{label}</span></Link>)}
      </nav>
      <div className="site-token-search" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false); }}>
        <label><MagnifyingGlassIcon aria-hidden="true" /><input type="search" aria-label="Search tokens" placeholder="Search tokens" value={query} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} onKeyDown={(event) => { if (event.key === "Escape") { setSearchOpen(false); event.currentTarget.blur(); } }} aria-controls="site-token-results" /></label>
        {searchOpen && <div id="site-token-results" className="site-search-results"><p>Available on Exchange</p>{results.map((token) => <Link prefetch={true} key={token.symbol} href={`/exchange?token=${token.symbol}`} onClick={() => setSearchOpen(false)}><strong>{token.symbol}</strong><span>{token.name}</span></Link>)}{!results.length && <p>No matching tokens</p>}</div>}
      </div>
      <div className="site-wallet"><ConnectWalletButton /></div>
      <DropdownMenu.Root modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.Trigger asChild><MenuToggle open={menuOpen} onOpenChange={setMenuOpen} className="site-menu-button" /></DropdownMenu.Trigger>
        <DropdownMenu.Portal><DropdownMenu.Content className="site-menu-panel" data-lenis-prevent align="end" sideOffset={12} collisionPadding={12}>
          {links.map(({ label, href }) => <DropdownMenu.Item key={href} asChild><Link prefetch={true} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link></DropdownMenu.Item>)}
          <DropdownMenu.Separator className="site-menu-separator" />
          <DropdownMenu.Item asChild><Link prefetch={true} href="/docs">Documentation</Link></DropdownMenu.Item>
        </DropdownMenu.Content></DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
  );
}

