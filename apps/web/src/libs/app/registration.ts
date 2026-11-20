import { decodeFunctionResult, encodeFunctionData, parseAbi, type Hex } from "viem";
import { avalancheFuji } from "@/libs/chain";
import dualRegistration from "../../../../../contracts/script/seed/dual-registered.json";
import { readRegistrationAbout } from "./network";

// Canonical Fuji registry used by the linked 8004scan profiles.
const registry = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
const abi = parseAbi(["function tokenURI(uint256 tokenId) view returns (string)"]);

// Mirrors the initial on-chain description written by DualRegister.s.sol.
function seededDescription(tokenId: string): string | null {
  const agent = dualRegistration.agents.find(({ canonicalTokenId }) => String(canonicalTokenId) === tokenId);
  return agent
    ? `Lantern Finance solver agent on Avalanche Fuji - AgentRegistry agent #${agent.ourId} (${dualRegistration.ourRegistry.toLowerCase()})`
    : null;
}

export async function loadAgentAbout(tokenId: string | null): Promise<string | null> {
  if (!tokenId || !/^\d+$/.test(tokenId)) return null;

  try {
    const data = encodeFunctionData({ abi, functionName: "tokenURI", args: [BigInt(tokenId)] });
    const response = await fetch(avalancheFuji.rpcUrls.default.http[0], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: registry, data }, "latest"],
      }),
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) return seededDescription(tokenId);

    const { result } = (await response.json()) as { result?: Hex };
    if (!result) return seededDescription(tokenId);
    const uri = decodeFunctionResult({ abi, functionName: "tokenURI", data: result });
    return readRegistrationAbout(uri);
  } catch {
    return seededDescription(tokenId);
  }
}
