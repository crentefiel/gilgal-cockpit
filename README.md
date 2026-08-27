# GILGAL Cockpit V1

GILGAL Cockpit is a focused visual control surface for the GILGAL guarded-development protocol. It answers one operational question: is there enough exact, reviewable evidence to let a human promote the current candidate without sacrificing the last known-good state?

> GILGAL é um protocolo para agentes de IA programarem sem destruir a última versão boa, usando o código estável anterior como memória e prova de comportamento.

## Run locally on Windows

Double-click [`INICIAR_GILGAL_COCKPIT.cmd`](INICIAR_GILGAL_COCKPIT.cmd), or run:

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://127.0.0.1:5173`.

## What GILGAL is

GILGAL combines established mechanisms—Git references, branches or worktrees, automated checks, regression contracts, manual gates and history—into a protocol that protects STABLE while an agent works in an isolated CANDIDATE.

- **STABLE** is the last known-good verified state and is never the normal AI laboratory.
- **CANDIDATE / WORK** originates from an exact STABLE reference and contains the experiment.
- **Sentinel** gathers code, test, regression, runtime, human and scope evidence.
- **Gate** applies explicit rules. A critical failure blocks; unresolved required evidence remains pending.
- **History** preserves promoted and failed cycles as evidence.

The repository pins the official [`crentefiel/gilgal-ai-workflow`](https://github.com/crentefiel/gilgal-ai-workflow) reference as a Git submodule at commit `07452009c7b7f96f391f22d43c26a6dd78e140e4`:

- GILGAL Protocol `0.3.0`
- GILGAL Sentinel reference implementation `0.2.0`

## Modo operacional local

Ao iniciar pela porta `5173`, o Cockpit conecta por padrão ao projeto-cobaia `D:\SINUCA-GILGAL`. A interface:

- lê Git, orçamento e o último relatório Sentinel reais;
- mostra STABLE e CANDIDATE com seus SHAs exatos;
- executa o Sentinel pelo botão **EXECUTAR SENTINEL**;
- abre a Sinuca pelo botão **ABRIR SINUCA**;
- registra o Human Check pelo CLI oficial, vinculado aos SHAs atuais;
- nunca promove a STABLE automaticamente.

Para apontar o Cockpit para outro projeto local, defina antes de iniciar:

```powershell
$env:GILGAL_COCKPIT_PROJECT = 'D:\MEU-PROJETO'
$env:GILGAL_COCKPIT_PROJECT_URL = 'http://127.0.0.1:5180/'
npm.cmd run dev -- --host 127.0.0.1
```

O projeto deve possuir `gilgal.sentinel.json`, a referência oficial compilada em `.gilgal/reference/sentinel/dist` e um repositório Git válido.

## What V1 demonstrates

The single-page Cockpit presents five connected areas: STABLE, CANDIDATE / WORK, SENTINEL, GATE and HISTORY. Its default operational target is the real Sinuca GILGAL repository. ASFALTO remains available only as isolated test/demo fixture data.

The domain model includes:

- a pure `evaluateGilgalGate(state)` engine shared by UI and promotion guard;
- SHA-bound human approval where approval for SHA X never approves SHA Y;
- stale-approval detection and required re-verification;
- critical regression and Regression Replay blocking;
- explicit, non-negative Change Budget limits controlled by HUMAN;
- agent restrictions for Human Check, budget changes and promotion;
- versioned local persistence with validation, migration seam, corruption fallback and reset;
- local promotion simulation that re-evaluates the current state before changing demo data.

### Executable Memory

STABLE is more than a backup. Its verified contracts provide executable historical memory against which the same candidate behaviors can be compared.

### Regression Replay

Every reproducible regression should become a reviewed contract. The V1 includes permanent contracts for stale approval and exact-SHA promotion safety.

### Change Budget

The real repository budget was declared before candidate implementation and is enforced against the diff from `main`. Zero is a valid limit; negative limits are invalid. A critical overrun reports `SCOPE EXPANSION DETECTED` and blocks the Gate.

### READY is not PROMOTED

READY means the configured evidence is sufficient. Promotion remains an explicit HUMAN decision outside the browser; the operational UI does not merge or move Git references.

## Local bridge boundary

The browser calls a same-origin local Vite bridge. That bridge reads the configured project and is the only component allowed to invoke the Sentinel CLI:

```text
Cockpit UI → RealProjectAdapter → /api/project → Git + Sentinel CLI
```

`LocalDemoAdapter` remains only for deterministic UI/domain tests. The operational page does not use fictitious localStorage evidence.

V1 does not implement:

- automatic Git promotion, checkout, merge or worktree creation;
- GitHub integration, backend, login, multi-user, cloud or webhooks;
- AI agent execution.

The approval button records only the official manual Sentinel approval for the current exact STABLE/CANDIDATE pair. READY still does not mean PROMOTED.

## Real GILGAL dogfooding

This repository itself is developed under GILGAL:

- `main` is STABLE at `5683e3f315f7b54f7223577f6513457edbd82927`;
- `gilgal/candidate/cockpit-v1` is the isolated CANDIDATE;
- `.gilgal/cycles/cockpit-v1.md` records the exact base and predeclared budget;
- `scripts/verify-gilgal.mjs` enforces REAL-GILGAL-01 through REAL-GILGAL-08;
- `gilgal.contracts.json` contains command, replay and manual contracts;
- the real manual visual contract remains PENDING until a human approves it.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run verify:gilgal
npm.cmd run sentinel:build
npm.cmd run gilgal -- sentinel --config gilgal.sentinel.json check
```

The last command runs the official pinned Sentinel. Because `cockpit-visual-real` is a required manual contract, the expected real Gate result before human review is PENDING (exit code 2), not READY.

## Design and integrity notes

- Gate vocabulary is limited to READY, PENDING and BLOCKED; evidence uses PASS, FAIL, PENDING, NOT TESTED and STALE.
- BLOCKED takes precedence over PENDING.
- A high number of passing checks never hides one critical failure.
- Promotion rechecks integrity, budget, current candidate SHA, approvals, Replay and Gate.
- Failed cycles remain visible; they do not replace STABLE.
- There are no quality scores. Compilar não basta.

## License and claims

This project makes no patent, worldwide novelty, exclusivity or impossibility-of-tampering claim. Git, worktrees, CI and testing are established engineering mechanisms; GILGAL is the documented protocol combining them around protected STABLE, isolated WORK, executable memory, replay, budget, evidence and explicit promotion.
