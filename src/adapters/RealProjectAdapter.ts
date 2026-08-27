import type { CheckKind, CheckStatus, CockpitData, GilgalCheck } from '../domain/types';

type ReportItem = {
  id: string;
  name?: string;
  status?: string;
  critical?: boolean;
  type?: 'command' | 'manual' | 'replay';
  summary?: string;
  exitCode?: number;
  startedAt?: string;
  candidateResult?: string;
  stableResult?: string;
  replayOrigin?: string;
};

export type RealProjectPayload = {
  project: { name: string; path: string; gameUrl: string; branch: string; headSha: string; dirty: boolean; reportPath: string | null };
  config: { stable?: { ref?: string }; changeBudget?: Partial<CockpitData['budget']> };
  report: {
    timestamp?: string;
    stable?: { ref?: string; sha?: string };
    candidate?: { ref?: string; sha?: string };
    git?: { workingTreeClean?: boolean };
    diff?: { insertions?: number; deletions?: number; changedFiles?: string[] };
    checks?: ReportItem[];
    contracts?: ReportItem[];
  } | null;
};

function statusOf(value?: string): CheckStatus {
  if (value === 'PASS' || value === 'FAIL' || value === 'PENDING' || value === 'NOT_TESTED' || value === 'STALE') return value;
  if (value === 'ERROR') return 'FAIL';
  return 'NOT_TESTED';
}

function kindOf(item: ReportItem): CheckKind {
  if (item.type === 'manual') return 'HUMAN';
  if (item.type === 'replay') return 'REPLAY';
  if (item.id === 'change-budget') return 'BUDGET';
  if (item.id === 'typecheck') return 'CODE';
  if (item.id === 'tests') return 'TEST';
  if (item.id === 'build') return 'RUNTIME';
  return 'REGRESSION';
}

export function mapRealProject(payload: RealProjectPayload): CockpitData {
  const report = payload.report;
  const stableSha = report?.stable?.sha ?? 'NOT_TESTED';
  const reportedCandidateSha = report?.candidate?.sha;
  const candidateSha = payload.project.headSha;
  const evidenceStale = Boolean(report && (payload.project.dirty || reportedCandidateSha !== candidateSha));
  const items = [...(report?.checks ?? []), ...(report?.contracts ?? [])];
  const checks: GilgalCheck[] = items.map((item) => ({
    id: item.id,
    label: item.name ?? item.id,
    kind: kindOf(item),
    critical: item.critical ?? true,
    required: item.critical ?? true,
    status: evidenceStale ? 'STALE' : statusOf(item.status),
    stableSha,
    candidateSha,
    evidence: { exitCode: item.exitCode, timestamp: item.startedAt ?? report?.timestamp, summary: item.summary },
  }));
  if (!report) {
    checks.push({ id: 'sentinel-not-run', label: 'Sentinel ainda não executado', kind: 'CODE', critical: true, required: true, status: 'NOT_TESTED', stableSha, candidateSha });
  }
  const configuredBudget = payload.config.changeBudget ?? {};
  const budget = {
    maxFiles: configuredBudget.maxFiles ?? 0,
    maxInsertions: configuredBudget.maxInsertions ?? 0,
    maxDeletions: configuredBudget.maxDeletions ?? 0,
    maxChangedLines: configuredBudget.maxChangedLines ?? 0,
  };
  const changedFiles = report?.diff?.changedFiles ?? [];
  const insertions = report?.diff?.insertions ?? 0;
  const deletions = report?.diff?.deletions ?? 0;
  const contracts = report?.contracts ?? [];
  const manualApprovals = evidenceStale ? [] : contracts.filter((item) => item.type === 'manual' && item.status === 'PASS');

  return {
    role: 'human',
    stable: { cycle: report?.stable?.ref ?? payload.config.stable?.ref ?? 'STABLE', branch: report?.stable?.ref ?? payload.config.stable?.ref ?? 'main', sha: stableSha, promotedAt: report?.timestamp ?? '', verifiedContracts: checks.filter((check) => check.status === 'PASS').length },
    candidate: { cycle: payload.project.branch, branch: payload.project.branch, intent: `Validar ${payload.project.name} pelo GILGAL Cockpit`, baseStableSha: stableSha, sha: candidateSha, diffSummary: changedFiles.slice(0, 6), usage: { files: changedFiles.length, insertions, deletions, changedLines: insertions + deletions } },
    checks,
    approvals: manualApprovals.map((item) => ({ checkId: item.id, stableSha, candidateSha, decision: 'PASS', approvedAt: report?.timestamp ?? '', approvedBy: 'human' })),
    budget,
    memory: contracts.filter((item) => item.type !== 'manual').map((item) => ({ id: item.id, label: item.name ?? item.id, stableStatus: statusOf(item.stableResult), candidateStatus: evidenceStale ? 'STALE' : statusOf(item.candidateResult ?? item.status) })),
    replays: contracts.filter((item) => item.type === 'replay').map((item) => ({ id: item.id, pastRegression: item.replayOrigin ?? item.name ?? item.id, stableStatus: statusOf(item.stableResult), candidateStatus: evidenceStale ? 'STALE' : statusOf(item.candidateResult ?? item.status), critical: item.critical ?? true })),
    history: [],
  };
}

async function request(path: string, init?: RequestInit): Promise<{ data: CockpitData; project: RealProjectPayload['project']; message?: string }> {
  const response = await fetch(path, init);
  const payload = await response.json() as { data?: RealProjectPayload; message?: string };
  if (!response.ok || !payload.data) throw new Error(payload.message ?? `Falha HTTP ${response.status}`);
  return { data: mapRealProject(payload.data), project: payload.data.project, message: payload.message };
}

export const RealProjectAdapter = {
  load: () => request('/api/project'),
  runSentinel: () => request('/api/project/run-sentinel', { method: 'POST' }),
  approve: (contractId: string) => request('/api/project/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contractId }) }),
};
