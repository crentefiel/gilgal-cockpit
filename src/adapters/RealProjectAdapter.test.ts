import { describe, expect, it } from 'vitest';
import { mapRealProject, type RealProjectPayload } from './RealProjectAdapter';

const payload: RealProjectPayload = {
  project: { name: 'Sinuca GILGAL', path: 'D:\\SINUCA-GILGAL', gameUrl: 'http://127.0.0.1:5180', openLabel: 'ABRIR SINUCA', branch: 'gilgal/candidate/sinuca-v1', headSha: 'candidate', dirty: false, reportPath: 'report.json' },
  config: { stable: { ref: 'main' }, changeBudget: { maxFiles: 30, maxInsertions: 5000, maxDeletions: 300, maxChangedLines: 5200 } },
  report: { timestamp: '2026-08-27T15:00:00Z', stable: { ref: 'main', sha: 'stable' }, candidate: { sha: 'candidate' }, diff: { insertions: 100, deletions: 5, changedFiles: ['a', 'b'] }, checks: [{ id: 'tests', name: 'Tests', status: 'PASS', critical: true }], contracts: [{ id: 'human', name: 'Human gameplay', type: 'manual', status: 'PENDING', critical: true }, { id: 'replay-theme', name: 'Theme replay', type: 'replay', status: 'PASS', critical: true, candidateResult: 'PASS', stableResult: 'NOT_RECORDED' }] },
};

describe('real project adapter', () => {
  it('maps exact report SHAs, budget and pending Human Check', () => {
    const data = mapRealProject(payload);
    expect(data.stable.sha).toBe('stable');
    expect(data.candidate.sha).toBe('candidate');
    expect(data.candidate.usage.files).toBe(2);
    expect(data.budget.maxChangedLines).toBe(5200);
    expect(data.checks.find((check) => check.kind === 'HUMAN')?.status).toBe('PENDING');
    expect(data.replays).toHaveLength(1);
  });

  it('marks every old report check stale when HEAD or worktree changes', () => {
    const changed = { ...payload, project: { ...payload.project, headSha: 'new-candidate' } };
    const data = mapRealProject(changed);
    expect(data.candidate.sha).toBe('new-candidate');
    expect(data.checks.every((check) => check.status === 'STALE')).toBe(true);
  });
});
