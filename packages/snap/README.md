# @lantern/snap — MetaMask Transaction Insights

Intercepts signing requests and shows the counterparty's **ERC-8004 identity +
reputation + risk** before the user signs (docs/05, $2,500 bounty track).

## How it works

1. MetaMask calls `onTransaction` with the pending transaction.
2. Snap checks the chain (`eip155:10143` only for now) and extracts `to`.
3. `GET http://localhost:4000/api/agents/lookup/:address` resolves the address
   to an agent (owner match or demo vault mapping — see docs/03).
4. The panel renders: agent name/id, owner, risk, executions, failures, score
   (`N/A` until the scoring formula lands). Non-agent addresses, contract
   deployments, unsupported chains, and an unreachable API each get an honest
   fallback panel — never a crash.

## Dev loop

```bash
pnpm install          # from repo root
pnpm test             # vitest — pure insight logic (no MetaMask needed)
pnpm typecheck
pnpm build            # mm-snap build → dist/bundle.js (SES-evaluated)
pnpm serve            # serves the snap locally (default http://localhost:8081)
```

Then install [MetaMask Flask](https://metamask.io/flask/) and connect the snap
from the served URL (Flask → Settings → Snaps → Add snap from local server).

## Notes

- `src/insights.ts` is pure and holds all copy/rows — extend there, test there.
- `src/index.ts` is the thin MetaMask-facing shell (fetch + render only).
- The API base is a dev constant; snap configuration UX is TBD (docs/05).
- A public Snap ID requires npm publishing + allowlisting — local Flask only
  until then.
