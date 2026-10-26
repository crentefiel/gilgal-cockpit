import { describe, expect, it } from 'vitest';
import { buildFusionReviewPrompt } from './fusion';
import type { CockpitData, GateEvaluation } from './domain/types';

describe('Fusion review prompt', () => {
  it('binds advisory review to the exact candidate and never grants promote authority', () => {
    const state = {
      role: 'human',
      stable: { cycle: 'stable', branch: 'main', sha: 'aaa111', promotedAt: '', verifiedContracts: 1 },
      candidate: { cycle: 'work', branch: 'candidate', intent: 'test fusion', baseStableSha: 'aaa111', sha: 'bbb222', diffSummary: ['src/App.tsx'], usage: { files: 1, insertions: 4, deletions: 1, changedLines: 5 } },
      checks: [], approvals: [], humanDecisions: [],
      budget: { maxFiles: 5, maxInsertions: 50, maxDeletions: 50, maxChangedLines: 100 },
      memory: [], replays: [], history: [], problems: [], hypotheses: [], candidateFamilies: [], failureMemory: [], comparativeGate: null,
    } as CockpitData;
    const gate: GateEvaluation = { status: 'PENDING', reasons: [{ code: 'HUMAN', message: 'human pending' }] };

    const prompt = buildFusionReviewPrompt(state, gate);
    expect(prompt).toContain('bbb222');
    expect(prompt).toContain('aaa111');
    expect(prompt).toContain('Fusion output is opinion, never PASS evidence');
    expect(prompt).toContain('ADVISORY ONLY');
  });
});
