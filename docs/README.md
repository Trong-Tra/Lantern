# Lantern — Shared Memory Index

> Single entry for every agent (human or AI) working in this repo.
> **Cold-start protocol lives in root `AGENTS.md` — read that + `MEMORY.md` §Current state first.**
> **Truth rule: `MEMORY.md` §Current state = what exists NOW. Docs = target design. On conflict, MEMORY wins.**

## Product in one line

Passkey-native agent identity and reputation platform on **Monad**.
Every autonomous agent gets verifiable **ERC-8004 identity** + **ERC-721 Agent Passport** + non-transferable **ERC-5192 soulbound history**.
Users discover agents in a web explorer and verify them at signing time via a **MetaMask Snap**.

Tagline: `Illuminate the agent economy.` — `Trust shouldn't be a leap in the dark.`

## Doc map

| File | What it answers | Owner |
| --- | --- | --- |
| `docs/00-vision.md` | Why this exists, who it's for, track + bounties | product |
| `docs/01-architecture.md` | 5 layers, repo mapping, data flow | all |
| `docs/02-identity-contracts.md` | ERC-8004 / ERC-721 / ERC-5192 + yield agent minting | contracts buddy |
| `docs/03-backend-api.md` | API endpoints, repositories, scoring (v1), Envio consumption | backend buddy |
| `docs/04-frontend.md` | Routes, explorer data layer, vault panel, a11y budgets | frontend |
| `docs/05-integrations.md` | Dynamic (passkey) + MetaMask Snap + Envio + OpenRouter | integrations |
| `docs/08-demo-runbook.md` | Hackathon demo staging: startup order, 7-act narrative, failure drills | all |
| `docs/09-agent-wallet-strategy.md` | **FinTechathon Topic F strategy brief (v2, canonical)** — problem, cross-border persona, differentiators (passport / Lumen v2 / RGA / native-currency lens), FISCO BCOS port, references | all |
| `MEMORY.md` (root) | **Current state (single truth)** + decisions + TBD + recent log | all — update every task |
| `GETTING_STARTED.md` (root) | Setup, run, test commands for every part of the monorepo | all |
| `apps/web/design.md` | Cinematic landing spec (source of truth for landing) | frontend |

* Package manager: `pnpm@12.4.2`, workspaces `apps/*`, `packages/*` (+ `indexer/` pinned `pnpm@10.32.0` for Envio).
* Git: `main`, remote `git@github.com:Trong-Tra/Lantern.git`. Docs + code in the same commit.

## How to use these docs

1. Starting a task? Root `AGENTS.md` → `MEMORY.md` §Current state → your ONE layer doc.
2. Changing behavior? Update the matching doc in the same PR/commit. Docs are code.
3. Unsure / placeholder? Mark `TBD` explicitly. Never invent contract addresses, URLs, or scores.
4. Conflict between doc and code? For current state, `MEMORY.md` wins — then fix the doc. For the landing page, code + `design.md` win.
