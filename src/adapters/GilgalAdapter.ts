import type { CockpitData } from '../domain/types';
import type { Problem, Hypothesis, CandidateFamily, FailureMemoryEntry, ComparativeGateEvaluation } from '../domain/types';

export interface GilgalAdapter {
  load(): CockpitData;
  save(data: CockpitData): void;
  reset(): CockpitData;
}

export interface HypothesisLedgerAdapter {
  load(): {
    problems: Problem[];
    hypotheses: Hypothesis[];
    candidateFamilies: CandidateFamily[];
    failureMemory: FailureMemoryEntry[];
    comparativeGate: ComparativeGateEvaluation | null;
  };
  save(ledger: {
    problems: Problem[];
    hypotheses: Hypothesis[];
    candidateFamilies: CandidateFamily[];
    failureMemory: FailureMemoryEntry[];
    comparativeGate: ComparativeGateEvaluation | null;
  }): void;
  reset(): {
    problems: Problem[];
    hypotheses: Hypothesis[];
    candidateFamilies: CandidateFamily[];
    failureMemory: FailureMemoryEntry[];
    comparativeGate: ComparativeGateEvaluation | null;
  };
  getProblems(): Problem[];
  getHypotheses(): Hypothesis[];
  getCandidateFamilies(): CandidateFamily[];
  getFailureMemory(): FailureMemoryEntry[];
  getComparativeGate(): ComparativeGateEvaluation | null;
  addProblem(problem: Problem): void;
  addHypothesis(hypothesis: Hypothesis): void;
  updateHypothesis(hypothesisId: string, updates: Partial<Hypothesis>): void;
  addCandidateFamily(family: CandidateFamily): void;
  updateCandidateFamily(familyId: string, updates: Partial<CandidateFamily>): void;
  recordFailureMemory(entry: FailureMemoryEntry): void;
  setComparativeGate(evaluation: ComparativeGateEvaluation): void;
}

// V2 seam only. A real implementation may call Sentinel CLI and read Git evidence.
// It is intentionally not implemented in Local Demo Mode.
export type SentinelGitAdapter = GilgalAdapter;

