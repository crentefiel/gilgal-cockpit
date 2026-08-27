# GILGAL Agent Instructions

This project follows the GILGAL workflow protocol. All agents must adhere to these rules.

## Core Invariants

**STABLE is never the laboratory. WORK/CANDIDATE is the laboratory.**

A failed experiment must not destroy the last known-good state.

A failed hypothesis must not silently become the foundation of the next hypothesis.

A rejected strategy must not be repeated without new evidence or explicit reopening.

## Operational Rules

- Nunca editar STABLE durante trabalho normal
- Identificar STABLE SHA e CANDIDATE SHA antes de editar
- Não promover automaticamente
- Human Check não pode ser autoaprovado por IA
- Hipótese REJECTED não pode virar silenciosamente base de nova tentativa
- Estratégia EXHAUSTED exige nova evidência ou decisão humana explícita
- Nova hipótese concorrente deve preferencialmente nascer da mesma STABLE
- READY != PROMOTED
- FAIL/PENDING crítico bloqueia promoção

## Workflow Discipline

1. **Before any edit**: Verify current STABLE SHA and CANDIDATE SHA. Confirm you are in WORK/CANDIDATE branch, not STABLE.

2. **When a candidate fails**: 
   - Register Failure Memory (hypothesis, strategy family, evidence, candidate SHA, reason)
   - Evaluate hypothesis state (ACTIVE → REJECTED/INCONCLUSIVE)
   - Evaluate Candidate Family (ACTIVE → EXHAUSTED if applicable)
   - Do NOT just patch the same WORK repeatedly

3. **When creating a new hypothesis**:
   - Prefer branching from the same STABLE base
   - Record in Hypothesis Ledger: problem, hypothesis, family, claim, experiment, required evidence, candidate ref
   - If refining an ACTIVE hypothesis, justify the continuation

4. **Human Checks**:
   - AI agents MUST NOT self-approve human-only checks
   - Human FAIL decisions are SHA-bound and recorded in `.gilgal/human-decisions.json`
   - Human FAIL blocks current candidate, records in History/Failure Memory, does NOT alter STABLE

5. **Comparative Gate**:
   - Critical FAIL → INELIGIBLE
   - Human evidence PENDING → PENDING
   - Family EXHAUSTED without valid reopening → INELIGIBLE
   - Hypothesis REJECTED → INELIGIBLE
   - No eligible candidate → NO WINNER (never pick "menos ruim")

6. **Change Budget**:
   - Explicit limits defined before work
   - AI MUST NOT silently increase budget to make candidate pass
   - SCOPE EXPANSION DETECTED blocks promotion if critical

7. **Sentinel Exit Codes** (reference implementation 0.2.0):
   - 0 = READY / PASS
   - 1 = FAIL / BLOCKED (valid evaluation result)
   - 2 = PENDING (valid evaluation result)
   - 3 = Configuration error
   - 4 = Internal error
   - Exit 1 and 2 are normal evaluation outcomes, NOT execution errors

## GILGAL 0.4 Domain Model

Key types (defined in `src/domain/types.ts`):
- `Problem` - Investigation problem identifier
- `Hypothesis` - Testable claim with state (ACTIVE, CONFIRMED, REJECTED, INCONCLUSIVE)
- `CandidateFamily` - Strategy family (ACTIVE, EXHAUSTED)
- `FailureMemoryEntry` - Rejected hypothesis record
- `ComparativeCandidate` - Candidate in comparison
- `ComparativeGateEvaluation` - Comparison result

## Project Structure

- `src/domain/types.ts` - Core domain types
- `src/domain/gate.ts` - Gate evaluation logic
- `src/domain/operations.ts` - State operations (human decisions, budget, promotion)
- `src/state/GilgalStateProvider.tsx` - React state management
- `src/adapters/` - Data adapters (LocalDemo, RealProject)
- `.gilgal/reference` - GILGAL protocol reference (submodule)
- `.gilgal/hypotheses.json` - Hypothesis Ledger (when active)
- `.gilgal/human-decisions.json` - Human decisions log

## Testing Requirements

All new features must have contract tests covering:
- COCKPIT-040-01: Loading real project doesn't show demo data
- COCKPIT-040-02: Sentinel exit 1 = valid BLOCKED, not HTTP error
- COCKPIT-040-03: Exit 3/4 remain operational errors
- COCKPIT-040-04: Human FAIL is SHA-bound
- COCKPIT-040-05: Human FAIL blocks current candidate
- COCKPIT-040-06: SHA change doesn't transfer human decision
- COCKPIT-040-07: REJECTED hypothesis not eligible in Comparative Gate
- COCKPIT-040-08: EXHAUSTED family blocks unauthorized retry
- COCKPIT-040-09: Reopen requires new evidence or human decision
- COCKPIT-040-10: Comparative Gate returns NO WINNER if all fail
- COCKPIT-040-11: Critical FAIL candidate never wins comparison
- COCKPIT-040-12: PENDING human stays PENDING
- COCKPIT-040-13: Project metadata not Sinuca-hardcoded
- COCKPIT-040-14: Hypothesis Ledger doesn't execute prose as commands
- COCKPIT-040-15: STABLE remains immutable

## Validation Commands

```bash
npm run typecheck
npm test
npm run build
npm run verify:gilgal
npm run sentinel:build
npm run sentinel
```