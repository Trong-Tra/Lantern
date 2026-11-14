import { createEffect, S, type Address } from "envio";
import { createPublicClient, defineChain, http } from "viem";

// ---------------------------------------------------------------------------
// On-chain reads for fields the events don't carry (Effect API — cached,
// rate-limited, preload-safe). See docs/indexer.md: AttestationMinted lacks
// amount/protocol/uri — resolved here from contract storage instead of
// requiring a contract redeploy.
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

// Deployed address (docs/contracts.md). Env var wins when set — on Envio Cloud set
// REPUTATION_ADDRESS in the dashboard if it differs.
const REPUTATION_ADDRESS = (process.env.REPUTATION_ADDRESS ??
  "0xb5A7CEB3195714e81082F8A8B0F8cd7470bB72f8") as Address;

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
