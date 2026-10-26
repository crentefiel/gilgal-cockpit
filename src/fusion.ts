import type { CockpitData, GateEvaluation } from './domain/types';

export type FusionStrategy = 'synthesize' | 'best_of';

export type FusionReviewConfig = {
  baseUrl: string;
  apiKey: string;
  k: number;
  models: string[];
  judge: string;
  strategy: FusionStrategy;
};

export type FusionPanelEntry = {
  model?: string;
  platform?: string;
  status?: string;
  content?: string;
  error?: string;
};

export type FusionReviewResult = {
  content: string;
  route?: string;
  summary?: Record<string, unknown> | null;
  details?: Record<string, unknown> | null;
};

export function buildFusionReviewPrompt(state: CockpitData, gate: GateEvaluation): string {
  const nonPassing = state.checks
    .filter((check) => check.status !== 'PASS')
    .map((check) => ({ id: check.id, kind: check.kind, status: check.status, critical: check.critical, summary: check.evidence?.summary }));

  const memory = state.failureMemory.slice(-8).map((entry) => ({
    family: entry.family,
    hypothesis: entry.hypothesis,
    result: entry.result,
    reason: entry.reason,
    candidateSha: entry.candidateSha,
  }));

  return [
    'You are an advisory review panel for GILGAL. Do not approve, promote, or claim evidence.',
    'Your job is to look for risks, missing checks, contradictions, stale assumptions, and likely regressions.',
    'The deterministic GILGAL Gate remains authoritative. Fusion output is opinion, never PASS evidence.',
    '',
    'CURRENT CANDIDATE',
    JSON.stringify({
      head: state.candidate.sha,
      baseStableSha: state.candidate.baseStableSha,
      branch: state.candidate.branch,
      intent: state.candidate.intent,
      diffSummary: state.candidate.diffSummary,
      changeBudgetUsage: state.candidate.usage,
      gateStatus: gate.status,
      gateReasons: gate.reasons,
      nonPassingChecks: nonPassing,
      recentFailureMemory: memory,
    }, null, 2),
    '',
    'Return a concise review in Portuguese with these sections:',
    '1. Riscos que o autor pode ter esquecido',
    '2. Contratos/checks que merecem revisão',
    '3. Possíveis regressões',
    '4. Divergências ou incertezas',
    '5. Próximos checks sugeridos',
    'Finish with: "ADVISORY ONLY — isto não é evidência nem autorização de promote."',
  ].join('\n');
}

function normalizedEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, '');
  if (!/^https?:\/\//i.test(trimmed)) throw new Error('A URL do FreeLLMAPI deve começar com http:// ou https://');
  return trimmed.endsWith('/v1') ? `${trimmed}/chat/completions` : `${trimmed}/v1/chat/completions`;
}

export async function requestFusionReview(config: FusionReviewConfig, state: CockpitData, gate: GateEvaluation): Promise<FusionReviewResult> {
  const messages = [
    { role: 'system' as const, content: 'You are GILGAL Fusion Review. Advisory only; never grant promotion authority.' },
    { role: 'user' as const, content: buildFusionReviewPrompt(state, gate) },
  ];

  const request = {
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    messages,
    fusion: {
      k: config.k,
      models: config.models.length ? config.models : undefined,
      judge: config.judge || undefined,
      strategy: config.strategy,
      expose_panel: true as const,
    },
  };

  if (window.gilgalFusion) return window.gilgalFusion.review(request);

  const response = await fetch(normalizedEndpoint(config.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({ model: 'fusion', messages, stream: false, fusion: request.fusion }),
  });

  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? `FreeLLMAPI respondeu HTTP ${response.status}`);

  return {
    content: body?.choices?.[0]?.message?.content ?? '',
    route: response.headers.get('x-routed-via') ?? undefined,
    summary: body?._fusion ?? null,
    details: body?.x_fusion ?? null,
  };
}

export function getFusionPanel(result: FusionReviewResult | null): FusionPanelEntry[] {
  const panel = result?.details?.panel;
  return Array.isArray(panel) ? panel.filter((entry): entry is FusionPanelEntry => Boolean(entry && typeof entry === 'object')) : [];
}
