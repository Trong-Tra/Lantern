import { defineChain } from "viem";

/** Legacy, read-only: the app runs on Avalanche Fuji. Kept only for the
 * pre-pivot agent-page panels (vault/swap-demo) until that page is rebuilt. */
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

/** Avalanche Fuji (docs/contracts.md) — where the Lantern market settles.
 * Browser reads (portfolio balances) via NEXT_PUBLIC_FUJI_RPC_URL; the public
 * RPC is the default so reads work without env setup. */
export const AVALANCHE_FUJI_ID = 43113;

const fujiRpcUrl =
  process.env.NEXT_PUBLIC_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc";

export const avalancheFuji = defineChain({
  id: AVALANCHE_FUJI_ID,
  name: "Avalanche Fuji",
  nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
  rpcUrls: { default: { http: [fujiRpcUrl] } },
  blockExplorers: {
    default: { name: "Snowtrace Testnet", url: "https://testnet.snowtrace.io" },
  },
});
