import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { LocalDemoAdapter } from '../adapters/LocalDemoAdapter';
import type { GilgalAdapter } from '../adapters/GilgalAdapter';
import { evaluateGilgalGate } from '../domain/gate';
import { decideHumanCheck, promoteCandidate, setCandidateSha, updateChangeBudget } from '../domain/operations';
import type { ChangeBudgetLimits, CockpitData, GateEvaluation, Role } from '../domain/types';

type ContextValue = {
  state: CockpitData;
  gate: GateEvaluation;
  notice: string;
  setRole(role: Role): void;
  decideHuman(decision: 'PASS' | 'FAIL'): void;
  changeBudget(budget: ChangeBudgetLimits): void;
  simulateShaChange(): void;
  promote(): void;
  reset(): void;
};

const GilgalContext = createContext<ContextValue | null>(null);

export function GilgalStateProvider({ children, adapter }: { children: ReactNode; adapter?: GilgalAdapter }) {
  const source = useMemo(() => adapter ?? new LocalDemoAdapter(), [adapter]);
  const [state, setState] = useState<CockpitData>(() => source.load());
  const [notice, setNotice] = useState('LOCAL DEMO MODE · Evidence shown here is demonstrative.');

  const commit = useCallback((next: CockpitData, message: string) => {
    source.save(next);
    setState(next);
    setNotice(message);
  }, [source]);

  const value = useMemo<ContextValue>(() => ({
    state,
    gate: evaluateGilgalGate(state),
    notice,
    setRole: (role) => commit({ ...state, role }, `Role switched to ${role.toUpperCase()}.`),
    decideHuman: (decision) => {
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
  }), [commit, notice, source, state]);

  return <GilgalContext.Provider value={value}>{children}</GilgalContext.Provider>;
}

export function useGilgal(): ContextValue {
  const value = useContext(GilgalContext);
  if (!value) throw new Error('useGilgal must be used inside GilgalStateProvider.');
  return value;
}

