import type { Problem, Hypothesis, CandidateFamily, FailureMemoryEntry, ComparativeGateEvaluation } from '../domain/types';

const STORAGE_KEY = 'gilgal-hypothesis-ledger';
const SCHEMA_VERSION = 1;

type LedgerStorage = {
  schemaVersion: number;
  problems: Problem[];
  hypotheses: Hypothesis[];
  candidateFamilies: CandidateFamily[];
  failureMemory: FailureMemoryEntry[];
  comparativeGate: ComparativeGateEvaluation | null;
};

function isValidLedger(value: unknown): value is LedgerStorage {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<LedgerStorage>;
  return v.schemaVersion === SCHEMA_VERSION &&
    Array.isArray(v.problems) &&
    Array.isArray(v.hypotheses) &&
    Array.isArray(v.candidateFamilies) &&
    Array.isArray(v.failureMemory);
}

function emptyLedger(): LedgerStorage {
  return {
    schemaVersion: SCHEMA_VERSION,
    problems: [],
    hypotheses: [],
    candidateFamilies: [],
    failureMemory: [],
    comparativeGate: null,
  };
}

export class HypothesisLedgerAdapter {
  constructor(private readonly storage: Storage = window.localStorage) {}

  load(): LedgerStorage {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return emptyLedger();
      const parsed = JSON.parse(raw);
      if (isValidLedger(parsed)) return parsed;
      return emptyLedger();
    } catch {
      return emptyLedger();
    }
  }

  save(ledger: LedgerStorage): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(ledger));
  }

  reset(): LedgerStorage {
    this.storage.removeItem(STORAGE_KEY);
    return emptyLedger();
  }

  getProblems(): Problem[] {
    return this.load().problems;
  }

  getHypotheses(): Hypothesis[] {
    return this.load().hypotheses;
  }

  getCandidateFamilies(): CandidateFamily[] {
    return this.load().candidateFamilies;
  }

  getFailureMemory(): FailureMemoryEntry[] {
    return this.load().failureMemory;
  }

  getComparativeGate(): ComparativeGateEvaluation | null {
    return this.load().comparativeGate;
  }

  addProblem(problem: Problem): void {
    const ledger = this.load();
    ledger.problems.push(problem);
    this.save(ledger);
  }

  addHypothesis(hypothesis: Hypothesis): void {
    const ledger = this.load();
    ledger.hypotheses.push(hypothesis);
    this.save(ledger);
  }

  updateHypothesis(hypothesisId: string, updates: Partial<Hypothesis>): void {
    const ledger = this.load();
    const index = ledger.hypotheses.findIndex((h) => h.id === hypothesisId);
    if (index >= 0) {
      ledger.hypotheses[index] = { ...ledger.hypotheses[index], ...updates };
      this.save(ledger);
    }
  }

  addCandidateFamily(family: CandidateFamily): void {
    const ledger = this.load();
    ledger.candidateFamilies.push(family);
    this.save(ledger);
  }

  updateCandidateFamily(familyId: string, updates: Partial<CandidateFamily>): void {
    const ledger = this.load();
    const index = ledger.candidateFamilies.findIndex((f) => f.id === familyId);
    if (index >= 0) {
      ledger.candidateFamilies[index] = { ...ledger.candidateFamilies[index], ...updates };
      this.save(ledger);
    }
  }

  recordFailureMemory(entry: FailureMemoryEntry): void {
    const ledger = this.load();
    ledger.failureMemory.push(entry);
    this.save(ledger);
  }

  setComparativeGate(evaluation: ComparativeGateEvaluation): void {
    const ledger = this.load();
    ledger.comparativeGate = evaluation;
    this.save(ledger);
  }
}