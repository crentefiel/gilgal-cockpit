import { evaluateGilgalGate } from './gate';
import type { ActionResult, ChangeBudgetLimits, CockpitData, HistoryCycle } from './types';

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

