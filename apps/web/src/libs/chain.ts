import { defineChain } from "viem";

/** Monad testnet (docs/01). Browser RPC via NEXT_PUBLIC_MONAD_RPC_URL. */
export const MONAD_TESTNET_ID = 10143;

const rpcUrl = process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";

export const monadTestnet = defineChain({
  id: MONAD_TESTNET_ID,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: {
    default: { name: "Monadscan Testnet", url: "https://testnet.monadscan.com" },
  },
});
