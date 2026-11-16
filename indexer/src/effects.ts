import { createEffect, S, type Address } from "envio";
import { createPublicClient, defineChain, http } from "viem";

// ---------------------------------------------------------------------------
// On-chain reads for fields the events don't carry (Effect API — cached,
// rate-limited, preload-safe). See docs/indexer.md: AttestationMinted lacks
// amount/protocol/uri and DemoPool.Sync lacks the token pair — resolved here
// from contract storage instead of requiring a contract redeploy.
// ---------------------------------------------------------------------------

const RPC_URL =
  process.env.ENVIO_AVAX_FUJI_RPC_URL ??
  process.env.AVAX_FUJI_RPC_URL ??
  // Public Avalanche Fuji C-Chain RPC — no auth needed for eth_call (the
  // HyperSync endpoint rejects unauthenticated calls with 401).
  "https://api.avax-test.network/ext/bc/C/rpc";

const avalancheFuji = defineChain({
  id: 43113,
  name: "Avalanche Fuji",
  nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const client = createPublicClient({ chain: avalancheFuji, transport: http(RPC_URL) });

// Env var wins (e.g. Envio Cloud dashboard); fallback = the verified Fuji
// deployment (docs/contracts.md — Reputation 0x5Df5…40B8 on 43113).
const REPUTATION_ADDRESS = (process.env.REPUTATION_ADDRESS ??
  "0x5Df5E5FD5396e1387A982a7A7450D0c7CEaB40B8") as Address;

const reputationAbi = [
  {
    type: "function",
    name: "getAttestation",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "agentId", type: "uint256" },
          { name: "actionType", type: "uint8" },
          { name: "result", type: "uint8" },
          { name: "amount", type: "uint256" },
          { name: "protocol", type: "string" },
          { name: "uri", type: "string" },
        ],
      },
    ],
    stateMutability: "view",
  },
] as const;

export const getAttestationDetails = createEffect(
  {
    name: "getAttestationDetails",
    input: { tokenId: S.bigint },
    output: {
      agentId: S.bigint,
      amount: S.bigint,
      protocol: S.string,
      uri: S.string,
    },
    rateLimit: { calls: 10, per: "second" },
    cache: true,
  },
  async ({ input }) => {
    const attestation = await client.readContract({
      address: REPUTATION_ADDRESS,
      abi: reputationAbi,
      functionName: "getAttestation",
      args: [input.tokenId],
    });
    return {
      agentId: attestation.agentId,
      amount: attestation.amount,
      protocol: attestation.protocol,
      uri: attestation.uri,
    };
  },
);

const demoPoolAbi = [
  {
    type: "function",
    name: "token0",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "token1",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

// Pool token pair is immutable, so this effect caches forever per pool.
export const getPoolTokens = createEffect(
  {
    name: "getPoolTokens",
    input: { pool: S.string },
    output: { token0: S.string, token1: S.string },
    rateLimit: { calls: 10, per: "second" },
    cache: true,
  },
  async ({ input }) => {
    const pool = input.pool as Address;
    const [token0, token1] = await Promise.all([
      client.readContract({ address: pool, abi: demoPoolAbi, functionName: "token0" }),
      client.readContract({ address: pool, abi: demoPoolAbi, functionName: "token1" }),
    ]);
    return { token0, token1 };
  },
);
