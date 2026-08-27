import { describe, expect, it } from 'vitest';
import { LocalDemoAdapter, SCHEMA_VERSION, STORAGE_KEY } from '../adapters/LocalDemoAdapter';
import { freshDemoData } from '../demo/demoData';
import { effectiveCheckStatus, evaluateGilgalGate, validateIntegrity } from './gate';
import { archiveFailedCandidate, decideHumanCheck, promoteCandidate, setCandidateSha, updateChangeBudget } from './operations';
import type { CockpitData, GilgalCheck } from './types';

function withCheck(state: CockpitData, patch: Partial<GilgalCheck>, index = 0): CockpitData {
  const checks = state.checks.map((check, position) => position === index ? { ...check, ...patch } : check);
  return { ...state, checks };
}

function readyState(): CockpitData {
  return decideHumanCheck(freshDemoData(), 'human-visual', 'PASS', '2026-08-27T10:00:00.000Z').state;
}

describe('GILGAL Cockpit V1 regression contracts', () => {
  it('COCKPIT-01 critical FAIL → BLOCKED', () => {
    expect(evaluateGilgalGate(withCheck(freshDemoData(), { status: 'FAIL' })).status).toBe('BLOCKED');
  });

  it('COCKPIT-02 99 PASS + 1 critical FAIL → BLOCKED', () => {
    const state = freshDemoData();
    const passChecks = Array.from({ length: 99 }, (_, index): GilgalCheck => ({
      id: `pass-${index}`, label: `PASS ${index}`, kind: 'TEST', critical: true, required: true,
      status: 'PASS', stableSha: state.stable.sha, candidateSha: state.candidate.sha,
    }));
    state.checks = [...passChecks, { ...passChecks[0], id: 'one-fail', status: 'FAIL' }];
    expect(evaluateGilgalGate(state).status).toBe('BLOCKED');
  });

  it('COCKPIT-03 required HUMAN PENDING → PENDING', () => expect(evaluateGilgalGate(freshDemoData()).status).toBe('PENDING'));
  it('COCKPIT-04 all requirements satisfied → READY', () => expect(evaluateGilgalGate(readyState()).status).toBe('READY'));

  it('COCKPIT-05 agent cannot create HumanApproval', () => {
    const outcome = decideHumanCheck({ ...freshDemoData(), role: 'agent' }, 'human-visual', 'PASS');
    expect(outcome.ok).toBe(false);
    expect(outcome.state.approvals).toHaveLength(0);
  });

  it('COCKPIT-06 agent cannot increase Change Budget', () => {
    const state = { ...freshDemoData(), role: 'agent' as const };
    const outcome = updateChangeBudget(state, { ...state.budget, maxFiles: 999 });
    expect(outcome.ok).toBe(false);
    expect(outcome.state.budget.maxFiles).toBe(10);
  });

  it('COCKPIT-07 budget exceeded → BLOCKED', () => {
    const state = freshDemoData();
    state.candidate.usage.files = state.budget.maxFiles + 1;
    expect(evaluateGilgalGate(state).status).toBe('BLOCKED');
  });

  it('COCKPIT-08 maxDeletions = 0 is valid', () => {
    const state = freshDemoData();
    state.budget.maxDeletions = 0;
    state.candidate.usage.deletions = 0;
    expect(validateIntegrity(state)).toEqual([]);
  });

  it('COCKPIT-09 negative budget invalid', () => {
    const state = freshDemoData();
    state.budget.maxFiles = -1;
    expect(validateIntegrity(state)).not.toEqual([]);
    expect(evaluateGilgalGate(state).status).toBe('BLOCKED');
  });

  it('COCKPIT-10 critical Replay FAIL → BLOCKED', () => {
    const state = freshDemoData();
    const replayIndex = state.checks.findIndex((check) => check.kind === 'REPLAY');
    expect(evaluateGilgalGate(withCheck(state, { status: 'FAIL' }, replayIndex)).status).toBe('BLOCKED');
  });

  it('COCKPIT-11 approval from previous SHA becomes STALE', () => {
    const changed = setCandidateSha(readyState(), 'def456').state;
    const human = changed.checks.find((check) => check.kind === 'HUMAN')!;
    expect(effectiveCheckStatus(human, changed)).toBe('STALE');
  });

  it('COCKPIT-12 STALE required approval → PENDING', () => {
    expect(evaluateGilgalGate(setCandidateSha(readyState(), 'def456').state).status).toBe('PENDING');
  });

  it('COCKPIT-13 READY does not automatically promote', () => {
    const state = readyState();
    const stableBefore = state.stable.sha;
    expect(evaluateGilgalGate(state).status).toBe('READY');
    expect(state.stable.sha).toBe(stableBefore);
  });

  it('COCKPIT-14 promotion re-evaluates Gate', () => {
    const state = readyState();
    expect(evaluateGilgalGate(state).status).toBe('READY');
    state.candidate.usage.files = 999;
    const outcome = promoteCandidate(state);
    expect(outcome.ok).toBe(false);
    expect(outcome.message).toContain('BLOCKED');
  });

  it('COCKPIT-15 agent cannot promote', () => expect(promoteCandidate({ ...readyState(), role: 'agent' }).ok).toBe(false));

  it('COCKPIT-16 failed candidate preserves STABLE', () => {
    const state = freshDemoData();
    const stableBefore = state.stable;
    const outcome = archiveFailedCandidate(state, 'Critical replay failed');
    expect(outcome.state.stable).toEqual(stableBefore);
    expect(outcome.state.history[0].result).toBe('FAILED');
  });

  it('COCKPIT-17 promoted candidate becomes new demo STABLE', () => {
    const state = readyState();
    const outcome = promoteCandidate(state, '2026-08-27T12:00:00.000Z');
    expect(outcome.ok).toBe(true);
    expect(outcome.state.stable.sha).toBe(state.candidate.sha);
  });

  it('COCKPIT-18 old STABLE remains in History', () => {
    const state = readyState();
    expect(promoteCandidate(state).state.history[0].stableSha).toBe(state.stable.sha);
  });

  it('COCKPIT-19 corrupted localStorage does not crash', () => {
    localStorage.setItem(STORAGE_KEY, '{broken');
    expect(new LocalDemoAdapter(localStorage).load().stable.cycle).toBe('asfalto-c1');
  });

  it('COCKPIT-20 Gate UI and promotion use same Gate engine', () => {
    const blocked = readyState();
    blocked.checks[0].status = 'FAIL';
    expect(evaluateGilgalGate(blocked).status).toBe('BLOCKED');
    expect(promoteCandidate(blocked).message).toContain('BLOCKED');
  });

  it('COCKPIT-21 critical NOT TESTED required → PENDING', () => {
    expect(evaluateGilgalGate(withCheck(freshDemoData(), { status: 'NOT_TESTED' })).status).toBe('PENDING');
  });

  it('COCKPIT-22 BLOCKED takes precedence over PENDING', () => {
    const state = withCheck(freshDemoData(), { status: 'FAIL' });
    expect(state.checks.some((check) => check.status === 'PENDING')).toBe(true);
    expect(evaluateGilgalGate(state).status).toBe('BLOCKED');
  });

  it('COCKPIT-23 zero-valued budgets are preserved', () => {
    const zero = { maxFiles: 0, maxInsertions: 0, maxDeletions: 0, maxChangedLines: 0 };
    const outcome = updateChangeBudget(freshDemoData(), zero);
    expect(outcome.ok).toBe(true);
    const storage = new LocalDemoAdapter(localStorage);
    storage.save(outcome.state);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).schemaVersion).toBe(SCHEMA_VERSION);
    expect(storage.load().budget).toEqual(zero);
  });

  it('COCKPIT-24 promotion is bound to current exact SHA', () => {
    const outcome = promoteCandidate(setCandidateSha(readyState(), 'new-sha').state);
    expect(outcome.ok).toBe(false);
    expect(outcome.state.stable.sha).toBe('81c728e');
  });
});

