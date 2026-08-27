import type { CockpitData } from '../domain/types';

const stableSha = '81c728e';
const candidateSha = 'b73ad42';
const limits = { maxFiles: 10, maxInsertions: 300, maxDeletions: 100, maxChangedLines: 400 };

export const demoData: CockpitData = {
  role: 'human',
  stable: {
    cycle: 'asfalto-c1',
    branch: 'gilgal/stable/asfalto-c1',
    sha: stableSha,
    promotedAt: '2026-08-25T18:20:00.000Z',
    verifiedContracts: 18,
  },
  candidate: {
    cycle: 'asfalto-c2',
    branch: 'gilgal/candidate/asfalto-c2',
    intent: 'Clarear Porto Sol',
    baseStableSha: stableSha,
    sha: candidateSha,
    diffSummary: ['Ajuste de iluminação ambiental', 'Calibração de contraste', 'Contratos de direção preservados'],
    usage: { files: 6, insertions: 182, deletions: 41, changedLines: 223 },
  },
  checks: [
    {
      id: 'typecheck', label: 'Typecheck', kind: 'CODE', critical: true, required: true, status: 'PASS',
      stableSha, candidateSha, evidence: { command: 'npm run typecheck', exitCode: 0, timestamp: '2026-08-26T14:02:00.000Z', summary: 'TypeScript clean.' },
    },
    {
      id: 'tests', label: 'Automated tests', kind: 'TEST', critical: true, required: true, status: 'PASS',
      stableSha, candidateSha, evidence: { command: 'npm test', exitCode: 0, timestamp: '2026-08-26T14:04:00.000Z', summary: '18/18 contracts PASS.' },
    },
    {
      id: 'replay-a', label: 'REPLAY-STEERING-A', kind: 'REPLAY', critical: true, required: true, status: 'PASS',
      stableSha, candidateSha, evidence: { command: 'npm run test:steering-a', exitCode: 0, summary: 'Past steering regression did not return.' },
    },
    {
      id: 'replay-d', label: 'REPLAY-STEERING-D', kind: 'REPLAY', critical: true, required: true, status: 'PASS',
      stableSha, candidateSha, evidence: { command: 'npm run test:steering-d', exitCode: 0, summary: 'Right steering remains preserved.' },
    },
    {
      id: 'runtime', label: 'Runtime smoke check', kind: 'RUNTIME', critical: true, required: true, status: 'PASS',
      stableSha, candidateSha, evidence: { command: 'npm run test:runtime', exitCode: 0, summary: 'Demo runtime completed without crash.' },
    },
    {
      id: 'human-visual', label: 'Human visual check', kind: 'HUMAN', critical: true, required: true, status: 'PENDING',
      stableSha, candidateSha, evidence: { summary: 'Visual acceptance must be supplied by HUMAN.' },
    },
  ],
  approvals: [],
  humanDecisions: [],
  budget: limits,
  memory: [
    { id: 'app-starts', label: 'App starts', stableStatus: 'PASS', candidateStatus: 'PASS' },
    { id: 'build', label: 'Build', stableStatus: 'PASS', candidateStatus: 'PASS' },
    { id: 'steering-a', label: 'Steering A = left', stableStatus: 'PASS', candidateStatus: 'PASS' },
    { id: 'steering-d', label: 'Steering D = right', stableStatus: 'PASS', candidateStatus: 'PASS' },
  ],
  replays: [
    {
      id: 'REPLAY-STEERING-A',
      pastRegression: 'A stopped turning left after an environment refactor.',
      stableStatus: 'PASS', candidateStatus: 'PASS', critical: true,
    },
    {
      id: 'REPLAY-STEERING-D',
      pastRegression: 'D input once lost focus during a scene transition.',
      stableStatus: 'PASS', candidateStatus: 'PASS', critical: true,
    },
  ],
  history: [
    {
      id: 'asfalto-failed-refactor', cycle: 'asfalto-failed-refactor', intent: 'Refatoração ampla',
      stableSha, candidateSha: '39e720b', result: 'FAILED',
      failureReason: 'SCOPE EXPANSION DETECTED · REPLAY-STEERING-A FAIL · STABLE PRESERVED',
      budget: { limits: { ...limits, maxFiles: 8 }, usage: { files: 13, insertions: 440, deletions: 180, changedLines: 620 } },
      checks: [{ id: 'replay-a', status: 'FAIL' }],
      createdAt: '2026-08-24T10:00:00.000Z', completedAt: '2026-08-24T11:22:00.000Z',
    },
    {
      id: 'asfalto-c1', cycle: 'asfalto-c1', intent: 'Baseline jogável', stableSha,
      candidateSha: stableSha, result: 'PROMOTED',
      budget: { limits, usage: { files: 4, insertions: 120, deletions: 14, changedLines: 134 } },
      checks: [
        { id: 'typecheck', status: 'PASS' }, { id: 'build', status: 'PASS' },
        { id: 'runtime', status: 'PASS' }, { id: 'steering-a', status: 'PASS' }, { id: 'steering-d', status: 'PASS' },
      ],
      createdAt: '2026-08-23T09:00:00.000Z', completedAt: '2026-08-23T16:35:00.000Z',
    },
  ],
  problems: [],
  hypotheses: [],
  candidateFamilies: [],
  failureMemory: [],
  comparativeGate: null,
};

export function freshDemoData(): CockpitData {
  return JSON.parse(JSON.stringify(demoData)) as CockpitData;
}

