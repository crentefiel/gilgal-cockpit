import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LocalDemoAdapter } from '../adapters/LocalDemoAdapter';
import type { GilgalAdapter } from '../adapters/GilgalAdapter';
import { RealProjectAdapter, type RealProjectPayload } from '../adapters/RealProjectAdapter';
import { evaluateGilgalGate } from '../domain/gate';
import { decideHumanCheck, promoteCandidate, setCandidateSha, updateChangeBudget } from '../domain/operations';
import type { ChangeBudgetLimits, CockpitData, GateEvaluation, Role } from '../domain/types';

type ContextValue = {
  state: CockpitData;
  gate: GateEvaluation;
  notice: string;
  mode: 'loading' | 'live' | 'demo-error' | 'demo-test';
  project: RealProjectPayload['project'] | null;
  busy: boolean;
  setRole(role: Role): void;
  decideHuman(decision: 'PASS' | 'FAIL'): void;
  changeBudget(budget: ChangeBudgetLimits): void;
  simulateShaChange(): void;
  promote(): void;
  reset(): void;
  refreshEvidence(): Promise<void>;
  runSentinel(): Promise<void>;
};

const GilgalContext = createContext<ContextValue | null>(null);

export function GilgalStateProvider({ children, adapter }: { children: ReactNode; adapter?: GilgalAdapter }) {
  const source = useMemo(() => adapter ?? new LocalDemoAdapter(), [adapter]);
  const [state, setState] = useState<CockpitData>(() => source.load());
  const [notice, setNotice] = useState(adapter ? 'Modo isolado de teste.' : 'Conectando ao projeto real...');
  const [mode, setMode] = useState<ContextValue['mode']>(adapter ? 'demo-test' : 'loading');
  const [project, setProject] = useState<RealProjectPayload['project'] | null>(null);
  const [busy, setBusy] = useState(false);

  const commit = useCallback((next: CockpitData, message: string) => {
    source.save(next);
    setState(next);
    setNotice(message);
  }, [source]);

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
    setNotice('Executando o Sentinel real na Sinuca GILGAL...');
    try { applyLive(await RealProjectAdapter.runSentinel(), 'Sentinel real concluído.'); }
    catch (error) { setNotice(`Falha ao executar Sentinel: ${error instanceof Error ? error.message : String(error)}`); }
    finally { setBusy(false); }
  }, [adapter, applyLive]);

  useEffect(() => { void refreshEvidence(); }, [refreshEvidence]);

  const value = useMemo<ContextValue>(() => ({
    state,
    gate: evaluateGilgalGate(state),
    notice,
    mode,
    project,
    busy,
    setRole: (role) => commit({ ...state, role }, `Role switched to ${role.toUpperCase()}.`),
    decideHuman: (decision) => {
      if (mode === 'live' && decision === 'PASS') {
        const human = state.checks.find((check) => check.kind === 'HUMAN');
        if (!human) { setNotice('Nenhum Human Check foi encontrado.'); return; }
        setBusy(true);
        setNotice('Registrando aprovação humana para o SHA atual...');
        void RealProjectAdapter.approve(human.id).then((result) => applyLive(result, 'Aprovação humana registrada.')).catch((error) => setNotice(`Falha na aprovação: ${error instanceof Error ? error.message : String(error)}`)).finally(() => setBusy(false));
        return;
      }
      if (mode === 'live') { setNotice('Reprovação real deve ser registrada como ciclo FAILED; esta ação ainda não altera Git.'); return; }
      const outcome = decideHumanCheck(state, 'human-visual', decision);
      if (outcome.ok) commit(outcome.state, outcome.message); else setNotice(outcome.message);
    },
    changeBudget: (budget) => {
      const outcome = updateChangeBudget(state, budget);
      if (outcome.ok) commit(outcome.state, outcome.message); else setNotice(outcome.message);
    },
    simulateShaChange: () => {
      const nextSha = state.candidate.sha === 'def456a' ? 'b73ad42' : 'def456a';
      const outcome = setCandidateSha(state, nextSha);
      commit(outcome.state, outcome.message);
    },
    promote: () => {
      const outcome = promoteCandidate(state);
      if (outcome.ok) commit(outcome.state, outcome.message); else setNotice(outcome.message);
    },
    reset: () => {
      const next = source.reset();
      setState(next);
      setNotice('Demo reset to schemaVersion 1 defaults.');
    },
    refreshEvidence,
    runSentinel,
  }), [applyLive, busy, commit, mode, notice, project, refreshEvidence, runSentinel, source, state]);

  return <GilgalContext.Provider value={value}>{children}</GilgalContext.Provider>;
}

export function useGilgal(): ContextValue {
  const value = useContext(GilgalContext);
  if (!value) throw new Error('useGilgal must be used inside GilgalStateProvider.');
  return value;
}
