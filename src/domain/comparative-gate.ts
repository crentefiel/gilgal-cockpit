import type { ComparativeCandidate, ComparativeGateEvaluation, ComparativeGateStatus, FailureMemoryEntry, Hypothesis, CandidateFamily } from './types';

export function evaluateComparativeGate(
  candidates: ComparativeCandidate[],
  hypotheses: Hypothesis[],
  candidateFamilies: CandidateFamily[],
  failureMemory: FailureMemoryEntry[],
  now = new Date().toISOString(),
): ComparativeGateEvaluation {
  const eligible: ComparativeCandidate[] = [];
  const ineligible: Array<ComparativeCandidate & { ineligibilityReason: string }> = [];

  for (const candidate of candidates) {
    const hypothesis = hypotheses.find((h) => h.id === candidate.hypothesisId);
    const family = candidateFamilies.find((f) => f.id === candidate.familyId);

    if (candidate.gateStatus === 'BLOCKED') {
      const criticalFails = candidate.criticalFailures.filter((f) => f).length;
      if (criticalFails > 0) {
        ineligible.push({ ...candidate, ineligibilityReason: 'Critical FAIL in Sentinel gate' });
        continue;
      }
    }

    if (hypothesis && hypothesis.state === 'REJECTED') {
      ineligible.push({ ...candidate, ineligibilityReason: `Hypothesis ${hypothesis.id} is REJECTED` });
      continue;
    }

    if (family && family.state === 'EXHAUSTED') {
      if (!family.reopenEvidence && !family.exhaustedReason?.includes('human')) {
        ineligible.push({ ...candidate, ineligibilityReason: `Strategy family ${family.id} is EXHAUSTED without valid reopening` });
        continue;
      }
    }

    if (candidate.humanCheckStatus === 'PENDING' || candidate.humanCheckStatus === 'NOT_TESTED') {
      ineligible.push({ ...candidate, ineligibilityReason: 'Human evidence is PENDING' });
      continue;
    }

    const hasRejectedHypothesisInMemory = failureMemory.some(
      (fm) => fm.hypothesisId === candidate.hypothesisId && fm.result === 'REJECTED',
    );
    if (hasRejectedHypothesisInMemory && (!hypothesis || hypothesis.state !== 'ACTIVE')) {
      ineligible.push({ ...candidate, ineligibilityReason: 'Candidate inherits a REJECTED hypothesis from Failure Memory' });
      continue;
    }

    eligible.push(candidate);
  }

  let status: ComparativeGateStatus = 'NO_WINNER';
  let winner: ComparativeCandidate | undefined;
  let reason = '';

  if (eligible.length === 0) {
    status = 'NO_WINNER';
    reason = 'No eligible candidates. All candidates are INELIGIBLE due to critical failures, rejected hypotheses, exhausted families, or pending human evidence.';
  } else if (eligible.length === 1) {
    status = 'ELIGIBLE';
    winner = eligible[0];
    reason = `Single eligible candidate: ${winner.candidateSha} (hypothesis: ${winner.hypothesisId}, family: ${winner.familyId})`;
  } else {
    status = 'ELIGIBLE';
    const withMostEvidence = eligible.sort((a, b) => b.criticalFailures.length - a.criticalFailures.length)[0];
    winner = withMostEvidence;
    reason = `Multiple eligible candidates. Selected ${winner.candidateSha} based on evidence. READY != PROMOTED - human decision still required.`;
  }

  return {
    status,
    eligibleCandidates: eligible,
    ineligibleCandidates: ineligible,
    winner,
    reason,
    evaluatedAt: now,
  };
}