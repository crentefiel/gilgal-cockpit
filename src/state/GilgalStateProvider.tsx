import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LocalDemoAdapter } from '../adapters/LocalDemoAdapter';
import type { GilgalAdapter } from '../adapters/GilgalAdapter';
import { RealProjectAdapter, type RealProjectPayload } from '../adapters/RealProjectAdapter';
import { evaluateGilgalGate } from '../domain/gate';
import { decideHumanCheck, decideHumanDecision, promoteCandidate, setCandidateSha, updateChangeBudget } from '../domain/operations';
import type { ChangeBudgetLimits, CockpitData, GateEvaluation, Role } from '../domain/types';

type ContextValue = {
  state: CockpitData | null;
  gate: GateEvaluation | null;
  notice: string;
  mode: 'loading' | 'live' | 'demo-error' | 'demo-test';
  project: RealProjectPayload['project'] | null;
  busy: boolean;
  setRole(role: Role): void;
  decideHuman(decision: 'PASS' | 'FAIL'): void;
  decideHumanDecision(contractId: string, decision: 'PASS' | 'FAIL', reason?: string): void;
  changeBudget(budget: ChangeBudgetLimits): void;
  simulateShaChange(): void;
  promote(): void;
  reset(): void;
  refreshEvidence(): Promise<void>;
  runSentinel(): Promise<void>;
};

const GilgalContext = createContext<ContextValue | null>(null);

function emptyCockpitData(): CockpitData {
  return {
    role: 'human',
    stable: { cycle: '', branch: '', sha: '', promotedAt: '', verifiedContracts: 0 },
    candidate: { cycle: '', branch: '', intent: '', baseStableSha: '', sha: '', diffSummary: [], usage: { files: 0, insertions: 0, deletions: 0, changedLines: 0 } },
    checks: [],
    approvals: [],
    humanDecisions: [],
    budget: { maxFiles: 0, maxInsertions: 0, maxDeletions: 0, maxChangedLines: 0 },
    memory: [],
    replays: [],
    history: [],
    problems: [],
    hypotheses: [],
    candidateFamilies: [],
    failureMemory: [],
    comparativeGate: null,
  };
}

export function GilgalStateProvider({ children, adapter }: { children: ReactNode; adapter?: GilgalAdapter }) {
  const source = useMemo(() => adapter ?? new LocalDemoAdapter(), [adapter]);
  const isLive = !adapter;
  const [state, setState] = useState<CockpitData | null>(() => isLive ? null : source.load());
  const [notice, setNotice] = useState(isLive ? 'Conectando ao projeto real...' : 'Modo isolado de teste.');
  const [mode, setMode] = useState<ContextValue['mode']>(isLive ? 'loading' : 'demo-test');
  const [project, setProject] = useState<RealProjectPayload['project'] | null>(null);
  const [busy, setBusy] = useState(false);

  const commit = useCallback((next: CockpitData, message: string) => {
    if (!isLive) source.save(next);
    setState(next);
    setNotice(message);
  }, [source, isLive]);

  const applyLive = useCallback((result: Awaited<ReturnType<typeof RealProjectAdapter.load>>, fallbackMessage: string) => {
    setState(result.data);
    setProject(result.project);
    setMode('live');
    setNotice(result.message ?? fallbackMessage);
  }, []);

  const refreshEvidence = useCallback(async () => {
    if (adapter) return;
    setBusy(true);
    try { applyLive(await RealProjectAdapter.load(), 'Evidência real atualizada a partir do último relatório local.'); }
    catch (error) { setMode('demo-error'); setNotice(`Falha ao conectar ao projeto real: ${error instanceof Error ? error.message : String(error)}`); }
    finally { setBusy(false); }
  }, [adapter, applyLive]);

  const runSentinel = useCallback(async () => {
    if (adapter) return;
    setBusy(true);
    setNotice('Executando Sentinel no projeto real...');
    try { applyLive(await RealProjectAdapter.runSentinel(), 'Sentinel real concluído.'); }
    catch (error) { setNotice(`Falha ao executar Sentinel: ${error instanceof Error ? error.message : String(error)}`); }
    finally { setBusy(false); }
  }, [adapter, applyLive]);

  useEffect(() => { void refreshEvidence(); }, [refreshEvidence]);

  const currentState = state ?? emptyCockpitData();
  const gate = state ? evaluateGilgalGate(state) : null;

  const value = useMemo<ContextValue>(() => ({
    state,
    gate,
    notice,
    mode,
    project,
    busy,
    setRole: (role) => commit({ ...currentState, role }, `Role switched to ${role.toUpperCase()}.`),
    decideHuman: (decision) => {
      if (mode === 'live' && decision === 'PASS') {
        const human = currentState.checks.find((check) => check.kind === 'HUMAN');
        if (!human) { setNotice('Nenhum Human Check foi encontrado.'); return; }
        setBusy(true);
        setNotice('Registrando aprovação humana para o SHA atual...');
        void RealProjectAdapter.approve(human.id).then((result) => applyLive(result, 'Aprovação humana registrada.')).catch((error) => setNotice(`Falha na aprovação: ${error instanceof Error ? error.message : String(error)}`)).finally(() => setBusy(false));
        return;
      }
      if (mode === 'live') { setNotice('Reprovação real deve ser registrada como ciclo FAILED; esta ação ainda não altera Git.'); return; }
      const outcome = decideHumanCheck(currentState, 'human-visual', decision);
      if (outcome.ok) commit(outcome.state, outcome.message); else setNotice(outcome.message);
    },
    decideHumanDecision: (contractId, decision, reason) => {
      if (mode === 'live') {
        setNotice('Decisão humana real deve ser registrada via Sentinel; esta ação é apenas demonstração.');
        return;
      }
      const outcome = decideHumanDecision(currentState, contractId, decision, reason);
      if (outcome.ok) commit(outcome.state, outcome.message); else setNotice(outcome.message);
    },
    changeBudget: (budget) => {
      const outcome = updateChangeBudget(currentState, budget);
      if (outcome.ok) commit(outcome.state, outcome.message); else setNotice(outcome.message);
    },
    simulateShaChange: () => {
      const nextSha = currentState.candidate.sha === 'def456a' ? 'b73ad42' : 'def456a';
      const outcome = setCandidateSha(currentState, nextSha);
      commit(outcome.state, outcome.message);
    },
    promote: () => {
      const outcome = promoteCandidate(currentState);
      if (outcome.ok) commit(outcome.state, outcome.message); else setNotice(outcome.message);
    },
    reset: () => {
      if (!isLive) {
        const next = source.reset();
        setState(next);
        setNotice('Demo reset to schemaVersion 1 defaults.');
      }
    },
    refreshEvidence,
    runSentinel,
  }), [applyLive, busy, commit, currentState, mode, notice, project, refreshEvidence, runSentinel, source, state, isLive]);

  return <GilgalContext.Provider value={value}>{children}</GilgalContext.Provider>;
}

export function useGilgal(): ContextValue {
  const value = useContext(GilgalContext);
  if (!value) throw new Error('useGilgal must be used inside GilgalStateProvider.');
  return value;
}
