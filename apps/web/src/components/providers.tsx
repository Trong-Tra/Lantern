"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, WagmiProvider } from "wagmi";
import { injected } from "wagmi/connectors";
import { monadTestnet } from "@/libs/chain";

// Browser RPC comes from NEXT_PUBLIC_MONAD_RPC_URL (apps/web/.env).
// Without it we render unwrapped — wallet panels show a configure notice.
const rpcConfigured = Boolean(process.env.NEXT_PUBLIC_MONAD_RPC_URL);

const config = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(monadTestnet.rpcUrls.default.http[0]),
  },
  connectors: [injected()],
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  if (!rpcConfigured) {
    return <>{children}</>;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
