import { createEffect, S, type Address } from "envio";
import { createPublicClient, defineChain, http } from "viem";

// ---------------------------------------------------------------------------
// On-chain reads for fields the events don't carry (Effect API — cached,
// rate-limited, preload-safe). See docs/05: Transfer lacks agentId/uri;
// AttestationMinted lacks amount/protocol/uri. Both are resolved here from
// contract storage instead of requiring a contract redeploy.
// ---------------------------------------------------------------------------

const RPC_URL =
  process.env.ENVIO_MONAD_RPC_URL ??
  process.env.MONAD_TESTNET_RPC_URL ??
  // Public HyperRPC for Monad testnet (Envio docs) — last-resort fallback.
  "https://monad-testnet.rpc.hypersync.xyz";

const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const client = createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) });

// Deployed addresses (docs/02). Env vars win when set — on Envio Cloud set
// AGENT_PASSPORT_ADDRESS / REPUTATION_ADDRESS in the dashboard if they differ.
const PASSPORT_ADDRESS = (process.env.AGENT_PASSPORT_ADDRESS ??
  "0x5Df5E5FD5396e1387A982a7A7450D0c7CEaB40B8") as Address;
const REPUTATION_ADDRESS = (process.env.REPUTATION_ADDRESS ??
  "0xb5A7CEB3195714e81082F8A8B0F8cd7470bB72f8") as Address;

const passportAbi = [
  {
    type: "function",
    name: "agentOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokenURI",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
] as const;

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

export const getPassportDetails = createEffect(
  {
    name: "getPassportDetails",
    input: { tokenId: S.bigint },
    output: { agentId: S.bigint, uri: S.string },
    rateLimit: { calls: 10, per: "second" },
    cache: true,
  },
  async ({ input }) => {
    const [agentId, uri] = await Promise.all([
      client.readContract({
        address: PASSPORT_ADDRESS,
        abi: passportAbi,
        functionName: "agentOf",
        args: [input.tokenId],
      }),
      client.readContract({
        address: PASSPORT_ADDRESS,
        abi: passportAbi,
        functionName: "tokenURI",
        args: [input.tokenId],
      }),
    ]);
    return { agentId, uri };
  },
);

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
