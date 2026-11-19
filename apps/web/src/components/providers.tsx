"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, WagmiProvider } from "wagmi";
import { injected } from "wagmi/connectors";
import { avalancheFuji } from "@/libs/chain";

// Fuji ships a public RPC default (NEXT_PUBLIC_FUJI_RPC_URL overrides it), so
// the wallet works without env setup — there is no configure-notice gate.
const config = createConfig({
  chains: [avalancheFuji],
  transports: {
    [avalancheFuji.id]: http(avalancheFuji.rpcUrls.default.http[0]),
  },
  connectors: [injected()],
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
