# Lantern Finance — Docs

> **The routing table for these docs lives in root `AGENTS.md` (§Doc map) — start there.**
> Truth rule: `MEMORY.md` §Current state = what exists NOW. Docs here describe target design. On conflict, MEMORY wins — fix the doc in the same commit.

Files:

| File | Scope |
| --- | --- |
| `00-vision.md` | Product vision — owner-only changes |
| `architecture.md` | Layers, repo mapping, data flow |
| `market.md` | **Lantern Finance Graph + Market build plan** (Go backend + contracts) |
| `contracts.md` | ERC-8004 registry + ERC-5192 reputation contracts |
| `api.md` | API endpoints, repository layer, Envio consumption |
| `indexer.md` | Envio HyperIndex |
| `frontend.md` | **Frozen pre-pivot frontend** — historical until the frontend rebuild |

Rules: changing behavior? Update the matching doc in the same commit. Unsure? Mark `TBD` — never invent addresses, URLs, scores, or tx hashes.
