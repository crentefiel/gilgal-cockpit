export type CheckStatus = 'PASS' | 'FAIL' | 'PENDING' | 'NOT_TESTED' | 'STALE';
export type GateStatus = 'READY' | 'BLOCKED' | 'PENDING';
export type Role = 'human' | 'agent';
export type CheckKind = 'CODE' | 'TEST' | 'REGRESSION' | 'REPLAY' | 'RUNTIME' | 'HUMAN' | 'BUDGET';

export type GilgalCheck = {
  id: string;
  label: string;
  kind: CheckKind;
  critical: boolean;
  required: boolean;
  status: CheckStatus;
  stableSha?: string;
  candidateSha: string;
  evidence?: {
    command?: string;
    exitCode?: number;
    timestamp?: string;
    summary?: string;
  };
};

export type HumanApproval = {
  checkId: string;
  stableSha: string;
  candidateSha: string;
  decision: 'PASS' | 'FAIL';
  approvedAt: string;
  approvedBy: 'human';
};

export type ChangeBudgetLimits = {
  maxFiles: number;
  maxInsertions: number;
  maxDeletions: number;
  maxChangedLines: number;
};

export type ChangeBudgetUsage = {
  files: number;
  insertions: number;
  deletions: number;
  changedLines: number;
};

export type StableState = {
  cycle: string;
  branch: string;
  sha: string;
  promotedAt: string;
  verifiedContracts: number;
};

export type CandidateState = {
  cycle: string;
  branch: string;
  intent: string;
  baseStableSha: string;
  sha: string;
  diffSummary: string[];
  usage: ChangeBudgetUsage;
};

export type MemoryContract = {
  id: string;
  label: string;
  stableStatus: CheckStatus;
  candidateStatus: CheckStatus;
};

export type ReplayContract = {
  id: string;
  pastRegression: string;
  stableStatus: CheckStatus;
  candidateStatus: CheckStatus;
  critical: boolean;
};

export type HistoryResult = 'PROMOTED' | 'FAILED' | 'BLOCKED' | 'ABANDONED';

export type HistoryCycle = {
  id: string;
  cycle: string;
  intent: string;
  stableSha?: string;
  candidateSha: string;
  result: HistoryResult;
  failureReason?: string;
  budget: { limits: ChangeBudgetLimits; usage: ChangeBudgetUsage };
  checks: Array<{ id: string; status: CheckStatus }>;
  createdAt: string;
  completedAt: string;
};

export type CockpitData = {
  role: Role;
  stable: StableState;
  candidate: CandidateState;
  checks: GilgalCheck[];
  approvals: HumanApproval[];
  budget: ChangeBudgetLimits;
  memory: MemoryContract[];
  replays: ReplayContract[];
  history: HistoryCycle[];
};

export type GateReason = {
  code: string;
  message: string;
};

export type GateEvaluation = {
  status: GateStatus;
  reasons: GateReason[];
};

export type ActionResult = {
  ok: boolean;
  state: CockpitData;
  message: string;
};

