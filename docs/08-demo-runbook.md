# 08 — Demo Runbook (hackathon staging)

> 7-minute demo: live on-chain identity → Envio indexing proof → Snap-verified
> deposit → reputation updates in real time. Everything below is the REAL
> integration — no canned screens.

## 0. Prereqs (do once, before judges arrive)

- **OrbStack running** (`docker info` must succeed — Docker Desktop is not installed).
- **MetaMask Flask** from https://metamask.io/flask/ (separate browser profile from
  production MetaMask is recommended). Snaps only run in Flask until allowlisted.
- Flask configured with **Monad Testnet**: chain id `10143`, RPC
  `https://testnet-rpc.monad.xyz`, symbol MON, explorer `https://testnet.monadscan.com`.
- Demo wallet funded with testnet MON (faucet: https://testnet.monad.xyz — needs
  ~0.5 MON for a deposit + gas).
- `packages/snap` built at least once (`pnpm build` in `packages/snap`).

## 1. Startup (4 terminals, in this order)

```bash
# T1 — indexer (Postgres + Hasura + HyperIndex). Wait for "Ready. Fully indexed".
cd indexer && pnpm dev

# T2 — API (serves live indexer data via DATA_SOURCE=envio)
pnpm dev:api          # from repo root

# T3 — web
pnpm dev:web          # from repo root  → http://localhost:3000

# T4 — snap dev server (NOTE: -p 8081 — 8080 is Hasura!)
cd packages/snap && pnpm exec mm-snap serve -p 8081
```

Then in Flask: Settings → Snaps → **Add snap from local server** →
`http://localhost:8081` → connect. The snap asks for transaction-insight +
network permissions.

Smoke checks (10 seconds):

```bash
curl -s localhost:4000/ | head -c 60      # API health
curl -s localhost:3000/explore | grep -c "Live testnet data"   # ≥1 = live mode
```

## 2. The demo narrative

### Act 1 — the vision (30s, `/`)
Cinematic landing scrolls itself. One line: *"Autonomous agents are here — the
question is which ones you can trust. Lantern gives every agent a verifiable
ERC-8004 identity and an earned, soulbound reputation history on Monad."*

### Act 2 — the agent economy is REAL (`/explore`)
- 15 agents, live emerald banner: **"served from the Monad testnet indexer (Envio)"**.
- Risk badges are computed live (v0 rule): Yield Keeper MEDIUM (5 fails / 62 execs),
  Swap Router HIGH (6/15), fresh agents UNKNOWN.

### Act 3 — prove the Envio integration (`/agent/1`)
This is the moment skeptics look for. Two proofs:

1. **Every history row has a `tx ↗` link** → click one → Monadscan opens the real
   ERC-5192 mint transaction. "This isn't our database — follow any entry to the chain."
2. **Show the GraphQL directly.** In T1's Hasura console (http://localhost:8080, admin
   secret `testing`) or:
   ```bash
   curl -s localhost:8080/v1/graphql -H 'content-type: application/json' \
     -H 'x-hasura-admin-secret: testing' \
     -d '{"query":"{ Agent_by_pk(id: \"1\") { name: uri attestations { actionType result txHash } } }"}'
   ```
   Point at T1's terminal: HyperSync is streaming the chain into Postgres; the API
   reads that GraphQL; the UI reads the API. Three hops, all live.

### Act 4 — talk to the agent (same page, chat panel)
Ask: *"How many failures do you have?"* — the persona answers from its real stats
and honestly cites its data source (live indexer vs quarantined mock).

### Act 5 — THE moment: Snap-verified deposit
On agent 1's profile, **"Stake with this agent"**:
1. Connect MetaMask (Flask).
2. Enter `0.1` MON → **Deposit** → signing popup appears.
3. **Point at the Snap panel**: "Yield Keeper · ERC-8004 #1 · Risk MEDIUM ·
   62 executions · 5 failures" — that's the transaction-insight snap resolving the
   vault address through `GET /api/agents/lookup/:address` before the user signs.
4. Sign.

### Act 6 — reputation is earned in the open
- Success note links to the deposit tx on Monadscan.
- **Refresh the page**: the attestation history now shows **63 entries** — the first
  one is `STAKE · SUCCESS · demo://protocols/agent-vault` with a `tx ↗` link.
- Re-run the GraphQL curl → count went 62 → 63. "The vault contract minted that
  attestation; Envio caught it in real time; the UI never touched our servers."

### Act 7 — the passkey story (30s, optional)
If asked about the $5k Dynamic bounty track: operator wallets are passkey-native
(P256/WebAuthn, no seed phrase) — the reference agent's identity is bound to a
passkey wallet, not an EOA. (Integration pending `NEXT_PUBLIC_DYNAMIC_ENV_ID`.)

## 3. Failure drills (memorize these)

| Symptom | Fix |
| --- | --- |
| Web banner says amber "Demo data" | `DATA_SOURCE=envio` missing in `apps/web/.env` — restart `pnpm dev:web` |
| API errors "Envio HTTP" / fetch failed | Indexer not running → start T1; or `DATA_SOURCE=mock` in root `.env` (mock fallback demo still works) |
| `pnpm dev` in indexer fails: port 8080 busy | `docker ps` → `docker stop <old container>` |
| Snap panel doesn't appear in signing popup | You're on production MetaMask — use **Flask**; snap must be connected from `http://localhost:8081` |
| Deposit reverts "not minter" | Impossible in the demo path (vault is an authorized executor); if seen, the vault env address is wrong |
| Wrong network in MetaMask | The panel shows a "Switch network" button — click it |

## 4. Offline / venue-Wi-Fi fallback

`DATA_SOURCE=mock` in root `.env` + `apps/web/.env` and restart API + web: full UI
works on quarantined mock records (amber banner says so honestly). Snap needs the
API on `localhost:4000` — localhost always works. Only Act 3's chain proofs and
Act 5/6 need the indexer + chain.
