import { evaluateGilgalGate } from './gate';
import { evaluateComparativeGate } from './comparative-gate';
import type { ActionResult, ChangeBudgetLimits, CockpitData, ComparativeCandidate, ComparativeGateEvaluation, FailureMemoryEntry, HistoryCycle, HumanDecision, Hypothesis, CandidateFamily, Problem } from './types';

function result(ok: boolean, state: CockpitData, message: string): ActionResult {
  return { ok, state, message };
}

export function decideHumanCheck(
  state: CockpitData,
  checkId: string,
  decision: 'PASS' | 'FAIL',
  now = new Date().toISOString(),
): ActionResult {
  if (state.role !== 'human') return result(false, state, 'Agent cannot create HumanApproval.');
  const check = state.checks.find((item) => item.id === checkId && item.kind === 'HUMAN');
  if (!check) return result(false, state, 'Human Check not found.');

  const approval = {
    checkId,
    stableSha: state.stable.sha,
    candidateSha: state.candidate.sha,
    decision,
    approvedAt: now,
    approvedBy: 'human' as const,
  };
  const approvals = [...state.approvals.filter((item) => item.checkId !== checkId), approval];
  return result(true, { ...state, approvals }, `Human Check marked ${decision} for ${state.candidate.sha}.`);
}

export function decideHumanDecision(
  state: CockpitData,
  contractId: string,
  decision: 'PASS' | 'FAIL',
  reason: string | undefined,
  now = new Date().toISOString(),
): ActionResult {
  if (state.role !== 'human') return result(false, state, 'Agent cannot create HumanDecision.');

  const humanDecision: HumanDecision = {
    contractId,
    stableSha: state.stable.sha,
    candidateSha: state.candidate.sha,
    decision,
    timestamp: now,
    source: 'human',
    reason,
  };

  const humanDecisions = [...state.humanDecisions.filter((d) => d.contractId !== contractId || d.candidateSha !== state.candidate.sha), humanDecision];

  if (decision === 'FAIL') {
    const failureCycle: HistoryCycle = {
      id: `human-fail-${state.candidate.cycle}-${now}`,
      cycle: state.candidate.cycle,
      intent: state.candidate.intent,
      stableSha: state.stable.sha,
      candidateSha: state.candidate.sha,
      result: 'FAILED',
      failureReason: `Human FAIL: ${reason ?? 'Nenhuma justificativa fornecida'}`,
      budget: { limits: state.budget, usage: state.candidate.usage },
      checks: state.checks.map((check) => ({ id: check.id, status: check.status })),
      createdAt: now,
      completedAt: now,
    };
    return result(true, { ...state, humanDecisions, history: [failureCycle, ...state.history] }, `Human FAIL recorded for ${state.candidate.sha}. Candidate blocked.`);
  }

  return result(true, { ...state, humanDecisions }, `Human ${decision} recorded for ${state.candidate.sha}.`);
}

export function updateChangeBudget(state: CockpitData, budget: ChangeBudgetLimits): ActionResult {
  if (state.role !== 'human') return result(false, state, 'Agent cannot alter the Change Budget.');
  if (Object.values(budget).some((value) => !Number.isFinite(value) || value < 0)) {
    return result(false, state, 'Negative Change Budget values are invalid.');
  }
  return result(true, { ...state, budget }, 'Change Budget updated by HUMAN.');
}

export function setCandidateSha(state: CockpitData, sha: string): ActionResult {
  if (!sha.trim()) return result(false, state, 'Candidate SHA cannot be empty.');
  const checks = state.checks.map((check) => ({ ...check, candidateSha: sha }));
  return result(
    true,
    { ...state, candidate: { ...state.candidate, sha }, checks },
    'Candidate SHA changed. Previous human approval is now STALE.',
  );
}

export function archiveFailedCandidate(
  state: CockpitData,
  reason: string,
  now = new Date().toISOString(),
): ActionResult {
  const cycle: HistoryCycle = {
    id: `${state.candidate.cycle}-${now}`,
    cycle: state.candidate.cycle,
    intent: state.candidate.intent,
    stableSha: state.stable.sha,
    candidateSha: state.candidate.sha,
    result: 'FAILED',
    failureReason: reason,
    budget: { limits: state.budget, usage: state.candidate.usage },
    checks: state.checks.map((check) => ({ id: check.id, status: check.status })),
    createdAt: now,
    completedAt: now,
  };
  return result(true, { ...state, history: [cycle, ...state.history] }, 'FAILED candidate archived; STABLE preserved.');
}

export function promoteCandidate(
  state: CockpitData,
  now = new Date().toISOString(),
): ActionResult {
  if (state.role !== 'human') return result(false, state, 'Agent cannot promote STABLE.');

  const gate = evaluateGilgalGate(state);
  if (gate.status !== 'READY') {
    return result(false, state, `Promotion rejected after Gate recheck: ${gate.status}.`);
  }

  const requiredHumanChecks = state.checks.filter((check) => check.kind === 'HUMAN' && check.required);
  const exactApprovalsExist = requiredHumanChecks.every((check) =>
    state.approvals.some(
      (approval) =>
        approval.checkId === check.id &&
        approval.stableSha === state.stable.sha &&
        approval.candidateSha === state.candidate.sha &&
        approval.decision === 'PASS',
    ),
  );
  if (!exactApprovalsExist) return result(false, state, 'Promotion rejected: exact-SHA human approval is missing.');

  const previousStableSha = state.stable.sha;
  const promoted: HistoryCycle = {
    id: `${state.candidate.cycle}-${now}`,
    cycle: state.candidate.cycle,
    intent: state.candidate.intent,
    stableSha: previousStableSha,
    candidateSha: state.candidate.sha,
    result: 'PROMOTED',
    budget: { limits: state.budget, usage: state.candidate.usage },
    checks: state.checks.map((check) => ({ id: check.id, status: check.status })),
    createdAt: now,
    completedAt: now,
  };
  const nextState: CockpitData = {
    ...state,
    stable: {
      cycle: state.candidate.cycle,
      branch: state.candidate.branch,
      sha: state.candidate.sha,
      promotedAt: now,
      verifiedContracts: state.checks.filter((check) => check.required).length,
    },
    candidate: { ...state.candidate, baseStableSha: state.candidate.sha },
    history: [promoted, ...state.history],
  };
  return result(
    true,
    nextState,
    `LOCAL DEMO PROMOTION — Previous STABLE: ${previousStableSha}; New STABLE: ${state.candidate.sha}. No Git repository was modified by this demo action.`,
  );
}

export function addProblem(
  state: CockpitData,
  problem: Omit<Problem, 'createdAt' | 'updatedAt'>,
  now = new Date().toISOString(),
): ActionResult {
  if (state.role !== 'human') return result(false, state, 'Agent cannot create Problem.');
  const newProblem: Problem = { ...problem, createdAt: now, updatedAt: now };
  return result(true, { ...state, problems: [...state.problems, newProblem] }, `Problem ${problem.id} created.`);
}

export function addHypothesis(
  state: CockpitData,
  hypothesis: Omit<Hypothesis, 'createdAt' | 'updatedAt'>,
  now = new Date().toISOString(),
): ActionResult {
  if (state.role !== 'human') return result(false, state, 'Agent cannot create Hypothesis.');
  const newHypothesis: Hypothesis = { ...hypothesis, createdAt: now, updatedAt: now };
  return result(true, { ...state, hypotheses: [...state.hypotheses, newHypothesis] }, `Hypothesis ${hypothesis.id} added to ledger.`);
}

export function updateHypothesisState(
  state: CockpitData,
  hypothesisId: string,
  newState: Hypothesis['state'],
  evidence: string[],
  now = new Date().toISOString(),
): ActionResult {
  if (state.role !== 'human') return result(false, state, 'Agent cannot update Hypothesis state.');
  const hypotheses = state.hypotheses.map((h) =>
    h.id === hypothesisId ? { ...h, state: newState, evidence: [...h.evidence, ...evidence], updatedAt: now } : h,
  );
  return result(true, { ...state, hypotheses }, `Hypothesis ${hypothesisId} state changed to ${newState}.`);
}

export function addCandidateFamily(
  state: CockpitData,
  family: Omit<CandidateFamily, 'createdAt' | 'updatedAt'>,
  now = new Date().toISOString(),
): ActionResult {
  if (state.role !== 'human') return result(false, state, 'Agent cannot create Candidate Family.');
  const newFamily: CandidateFamily = { ...family, createdAt: now, updatedAt: now };
  return result(true, { ...state, candidateFamilies: [...state.candidateFamilies, newFamily] }, `Candidate Family ${family.id} created.`);
}

export function exhaustCandidateFamily(
  state: CockpitData,
  familyId: string,
  reason: string,
  now = new Date().toISOString(),
): ActionResult {
  if (state.role !== 'human') return result(false, state, 'Agent cannot exhaust Candidate Family.');
  const candidateFamilies = state.candidateFamilies.map((f) =>
    f.id === familyId ? { ...f, state: 'EXHAUSTED' as const, exhaustedAt: now, exhaustedReason: reason, updatedAt: now } : f,
  );
  return result(true, { ...state, candidateFamilies }, `Candidate Family ${familyId} marked EXHAUSTED: ${reason}`);
}

export function reopenCandidateFamily(
  state: CockpitData,
  familyId: string,
  newEvidence: string,
  now = new Date().toISOString(),
): ActionResult {
  if (state.role !== 'human') return result(false, state, 'Agent cannot reopen Candidate Family.');
  const candidateFamilies = state.candidateFamilies.map((f) =>
    f.id === familyId ? { ...f, state: 'ACTIVE' as const, reopenEvidence: newEvidence, exhaustedAt: undefined, exhaustedReason: undefined, updatedAt: now } : f,
  );
  return result(true, { ...state, candidateFamilies }, `Candidate Family ${familyId} reopened with new evidence: ${newEvidence}`);
}

export function recordFailureMemory(
  state: CockpitData,
  entry: Omit<FailureMemoryEntry, 'recordedAt'>,
  now = new Date().toISOString(),
): ActionResult {
  if (state.role !== 'human') return result(false, state, 'Agent cannot record Failure Memory.');
  const failureMemory: FailureMemoryEntry = { ...entry, recordedAt: now };
  return result(true, { ...state, failureMemory: [...state.failureMemory, failureMemory] }, `Failure Memory recorded for hypothesis ${entry.hypothesisId}.`);
}

export function evaluateComparativeGateForState(
  state: CockpitData,
  candidates: ComparativeCandidate[],
  now = new Date().toISOString(),
): ActionResult {
  const evaluation = evaluateComparativeGate(candidates, state.hypotheses, state.candidateFamilies, state.failureMemory, now);
  return result(true, { ...state, comparativeGate: evaluation }, `Comparative Gate evaluated: ${evaluation.status}. ${evaluation.reason}`);
}

