import type {
  ChangeBudgetLimits,
  ChangeBudgetUsage,
  CheckStatus,
  CockpitData,
  GateEvaluation,
  GilgalCheck,
} from './types';

const pendingStatuses: CheckStatus[] = ['PENDING', 'NOT_TESTED', 'STALE'];

export function validateIntegrity(state: CockpitData): string[] {
  const issues: string[] = [];
  const limits = Object.values(state.budget);

  if (!state.stable.sha) issues.push('STABLE SHA is missing.');
  if (!state.candidate.sha) issues.push('Candidate SHA is missing.');
  if (state.candidate.baseStableSha !== state.stable.sha) {
    issues.push('Candidate is not based on the current exact STABLE SHA.');
  }
  if (limits.some((value) => !Number.isFinite(value) || value < 0)) {
    issues.push('Change Budget contains an invalid negative or non-finite limit.');
  }
  for (const cycle of state.history) {
    if (cycle.result === 'PROMOTED' && !cycle.stableSha) {
      issues.push(`PROMOTED history cycle ${cycle.cycle} has no STABLE SHA.`);
    }
  }
  return issues;
}

export function isBudgetExceeded(limits: ChangeBudgetLimits, usage: ChangeBudgetUsage): boolean {
  return (
    usage.files > limits.maxFiles ||
    usage.insertions > limits.maxInsertions ||
    usage.deletions > limits.maxDeletions ||
    usage.changedLines > limits.maxChangedLines
  );
}

export function effectiveCheckStatus(check: GilgalCheck, state: CockpitData): CheckStatus {
  if (check.candidateSha !== state.candidate.sha) return 'STALE';
  if (check.stableSha && check.stableSha !== state.stable.sha) return 'STALE';

  if (check.kind !== 'HUMAN') return check.status;

  const exactApproval = state.approvals.find(
    (approval) =>
      approval.checkId === check.id &&
      approval.stableSha === state.stable.sha &&
      approval.candidateSha === state.candidate.sha,
  );
  if (exactApproval) return exactApproval.decision;
  if (state.approvals.some((approval) => approval.checkId === check.id)) return 'STALE';
  return check.status;
}

export function evaluateGilgalGate(state: CockpitData): GateEvaluation {
  const blocked = [];
  const pending = [];

  for (const issue of validateIntegrity(state)) {
    blocked.push({ code: 'INTEGRITY_INVALID', message: issue });
  }

  if (isBudgetExceeded(state.budget, state.candidate.usage)) {
    blocked.push({ code: 'BUDGET_EXCEEDED', message: 'SCOPE EXPANSION DETECTED' });
  }

  for (const check of state.checks) {
    const status = effectiveCheckStatus(check, state);
    if (check.critical && status === 'FAIL') {
      blocked.push({
        code: check.kind === 'REPLAY' ? 'CRITICAL_REPLAY_FAILED' : 'CRITICAL_CHECK_FAILED',
        message: `${check.label}: FAIL`,
      });
    } else if (check.required && pendingStatuses.includes(status)) {
      pending.push({
        code: status === 'STALE' ? 'STALE_EVIDENCE' : 'REQUIRED_CHECK_PENDING',
        message: `${check.label}: ${status}`,
      });
    }
  }

  if (blocked.length) return { status: 'BLOCKED', reasons: [...blocked, ...pending] };
  if (pending.length) return { status: 'PENDING', reasons: pending };
  return {
    status: 'READY',
    reasons: [{ code: 'ALL_REQUIRED_EVIDENCE_PASS', message: 'All required checks satisfy the current exact SHA.' }],
  };
}

