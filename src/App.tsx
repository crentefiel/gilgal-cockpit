import { effectiveCheckStatus, isBudgetExceeded } from './domain/gate';
import type { CheckStatus, GilgalCheck } from './domain/types';
import { useGilgal } from './state/GilgalStateProvider';

function Status({ value }: { value: CheckStatus | 'READY' | 'BLOCKED' }) {
  return <span className={`status status--${value.toLowerCase().replace('_', '-')}`}>{value.replace('_', ' ')}</span>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

function Sha({ children }: { children: string }) {
  return <code className="sha">{children}</code>;
}

function CheckCard({ check }: { check: GilgalCheck }) {
  const { state } = useGilgal();
  const status = effectiveCheckStatus(check, state);
  return (
    <article className="check-card">
      <div className="check-card__head">
        <div><span className="check-kind">{check.kind}</span><h3>{check.label}</h3></div>
        <Status value={status} />
      </div>
      <dl className="evidence-list">
        <div><dt>Candidate</dt><dd><Sha>{state.candidate.sha}</Sha></dd></div>
        {check.evidence?.command && <div><dt>Command</dt><dd><code>{check.evidence.command}</code></dd></div>}
        {check.evidence?.exitCode !== undefined && <div><dt>Exit</dt><dd>{check.evidence.exitCode}</dd></div>}
      </dl>
      {check.evidence?.summary && <p className="fine-print">{check.evidence.summary}</p>}
      <span className="demo-evidence">DEMO EVIDENCE</span>
    </article>
  );
}

function BudgetMetric({ label, used, limit }: { label: string; used: number; limit: number }) {
  const exceeded = used > limit;
  const percent = limit === 0 ? (used === 0 ? 0 : 100) : Math.min(100, (used / limit) * 100);
  return (
    <div className={`budget-metric ${exceeded ? 'budget-metric--exceeded' : ''}`}>
      <div><span>{label}</span><strong>{used} / {limit}</strong></div>
      <div className="budget-track"><span style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

export function App() {
  const { state, gate, notice, setRole, decideHuman, changeBudget, simulateShaChange, promote, reset } = useGilgal();
  const budgetExceeded = isBudgetExceeded(state.budget, state.candidate.usage);
  const humanCheck = state.checks.find((check) => check.kind === 'HUMAN');
  const humanStatus = humanCheck ? effectiveCheckStatus(humanCheck, state) : 'NOT_TESTED';
  const setLimit = (key: keyof typeof state.budget, value: string) => changeBudget({ ...state.budget, [key]: Number(value) });
  const confirmReset = () => { if (window.confirm('Resetar todos os dados locais da demonstração?')) reset(); };

  return (
    <div className="cockpit-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="GILGAL Cockpit — início"><span className="brand-mark">G</span><span>GILGAL <strong>COCKPIT</strong></span></a>
        <div className="topbar__controls">
          <div className="role-switch" aria-label="Demo role">
            <button className={state.role === 'human' ? 'active' : ''} onClick={() => setRole('human')}>HUMAN</button>
            <button className={state.role === 'agent' ? 'active' : ''} onClick={() => setRole('agent')}>AGENT</button>
          </div>
          <span className="demo-mode"><i /> LOCAL DEMO MODE</span>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div><Eyebrow>GUARDED DEVELOPMENT / CONTROL SURFACE</Eyebrow><h1>A última versão boa<br />permanece <em>intocada.</em></h1></div>
          <div className="hero-copy"><p>STABLE permanece protegida. CANDIDATE trabalha isolado. Sentinel reúne as evidências. Gate decide se existe base suficiente para promoção.</p><strong>A próxima promoção pode ser recusada.</strong></div>
        </section>

        <div className="notice" role="status"><span>LOCAL</span>{notice}</div>

        <section className="state-grid" aria-label="Stable and candidate">
          <article className="panel stable-panel">
            <div className="panel-heading"><div><Eyebrow>01 / PROTECTED</Eyebrow><h2>STABLE</h2></div><span className="readonly">READ ONLY</span></div>
            <p className="section-kicker">LAST KNOWN-GOOD VERIFIED STATE</p>
            <div className="cycle-name">{state.stable.cycle}</div>
            <dl className="data-grid">
              <div><dt>Branch / ref</dt><dd>{state.stable.branch}</dd></div><div><dt>SHA</dt><dd><Sha>{state.stable.sha}</Sha></dd></div>
              <div><dt>Promoted</dt><dd>{new Date(state.stable.promotedAt).toLocaleDateString('pt-BR')}</dd></div><div><dt>Contracts</dt><dd>{state.stable.verifiedContracts} verified</dd></div>
            </dl>
            <p className="human-stamp">PROMOTED BY <strong>HUMAN</strong></p>
          </article>

          <article className="panel candidate-panel">
            <div className="panel-heading"><div><Eyebrow>02 / LABORATORY</Eyebrow><h2>CANDIDATE / WORK</h2></div><Status value={gate.status} /></div>
            <p className="section-kicker">CURRENT ISOLATED CHANGE</p>
            <div className="candidate-intent"><span>Intent</span><strong>{state.candidate.intent}</strong></div>
            <div className="sha-pair"><div><span>Base STABLE</span><Sha>{state.candidate.baseStableSha}</Sha></div><span>→</span><div><span>Candidate</span><Sha>{state.candidate.sha}</Sha></div></div>
            <div className="diff-numbers"><div><strong>{state.candidate.usage.files}</strong><span>files</span></div><div><strong>+{state.candidate.usage.insertions}</strong><span>insertions</span></div><div><strong>−{state.candidate.usage.deletions}</strong><span>deletions</span></div><div><strong>{state.candidate.usage.changedLines}</strong><span>changed lines</span></div></div>
            <ul className="diff-summary">{state.candidate.diffSummary.map((item) => <li key={item}>{item}</li>)}</ul>
            <button className="text-button" onClick={simulateShaChange}>Simular mudança de SHA →</button>
          </article>
        </section>

        <section className="section-block" id="sentinel">
          <div className="section-heading"><div><Eyebrow>03 / EVIDENCE LAYER</Eyebrow><h2>SENTINEL</h2></div><p>Verifica o candidato. Não promove código.<br /><strong>Compilar não basta.</strong></p></div>
          <div className="check-grid">{state.checks.filter((check) => ['CODE', 'TEST', 'RUNTIME'].includes(check.kind)).map((check) => <CheckCard key={check.id} check={check} />)}</div>

          <div className="memory-panel">
            <div className="memory-intro"><Eyebrow>EXECUTABLE MEMORY</Eyebrow><h3>STABLE não é apenas backup.<br />STABLE é memória executável.</h3><p>O comportamento comprovado anteriormente é comparado com o candidato atual.</p></div>
            <div className="memory-table" role="table" aria-label="Executable memory contracts">
              <div className="memory-row memory-row--head" role="row"><span>CONTRACT</span><span>STABLE</span><span>CANDIDATE</span></div>
              {state.memory.map((contract) => <div className="memory-row" role="row" key={contract.id}><strong>{contract.label}</strong><Status value={contract.stableStatus} /><Status value={contract.candidateStatus} /></div>)}
            </div>
          </div>

          <div className="replay-section">
            <div className="subheading"><div><Eyebrow>REGRESSION REPLAY</Eyebrow><h3>Every regression should become a contract.</h3></div><span>{state.replays.length} REPLAYS</span></div>
            <div className="replay-grid">{state.replays.map((replay) => <article className="replay-card" key={replay.id}><div><code>{replay.id}</code><Status value={replay.candidateStatus} /></div><p><strong>Past regression</strong>{replay.pastRegression}</p><footer><span>STABLE <Status value={replay.stableStatus} /></span><span>CANDIDATE <Status value={replay.candidateStatus} /></span></footer></article>)}</div>
          </div>

          <div className="budget-section">
            <div className="budget-copy"><Eyebrow>CHANGE BUDGET</Eyebrow><h3>Escopo definido<br />antes do trabalho.</h3><p>Budget owner <strong>HUMAN</strong></p><span className="lock">🔒 AGENT CANNOT ALTER</span>{budgetExceeded && <div className="scope-alert">SCOPE EXPANSION DETECTED</div>}</div>
            <div className="budget-metrics"><BudgetMetric label="Files" used={state.candidate.usage.files} limit={state.budget.maxFiles} /><BudgetMetric label="Insertions" used={state.candidate.usage.insertions} limit={state.budget.maxInsertions} /><BudgetMetric label="Deletions" used={state.candidate.usage.deletions} limit={state.budget.maxDeletions} /><BudgetMetric label="Changed lines" used={state.candidate.usage.changedLines} limit={state.budget.maxChangedLines} /></div>
            <div className="budget-edit"><span>LIMITS · {state.role.toUpperCase()}</span>{Object.entries(state.budget).map(([key, value]) => <label key={key}>{key.replace('max', '')}<input aria-label={key} type="number" min="0" value={value} disabled={state.role === 'agent'} onChange={(event) => setLimit(key as keyof typeof state.budget, event.target.value)} /></label>)}</div>
          </div>

          {humanCheck && <div className="human-check">
            <div><Eyebrow>HUMAN CHECK</Eyebrow><h3>Visual acceptance</h3><p>A human approval for SHA X does not approve SHA Y.</p></div>
            <div className="human-check__status"><span>Current evidence</span><Status value={humanStatus} /><Sha>{state.candidate.sha}</Sha></div>
            <div className="human-actions"><button disabled={state.role === 'agent'} className="button button--pass" onClick={() => decideHuman('PASS')}>PASS</button><button disabled={state.role === 'agent'} className="button button--fail" onClick={() => decideHuman('FAIL')}>FAIL</button>{state.role === 'agent' && <small>Agent cannot approve Human Checks.</small>}</div>
          </div>}
        </section>

        <section className={`gate-section gate-section--${gate.status.toLowerCase()}`} id="gate">
          <div className="gate-number">04</div><div className="gate-copy"><Eyebrow>PROMOTION DECISION</Eyebrow><h2>GATE</h2><p>READY ≠ PROMOTED</p></div>
          <div className="gate-result"><Status value={gate.status} /><h3>{gate.status === 'READY' ? 'Evidence is sufficient.' : gate.status === 'BLOCKED' ? 'Promotion is refused.' : 'Human evidence is still required.'}</h3><ul>{gate.reasons.map((reason) => <li key={`${reason.code}-${reason.message}`}>{reason.message}</li>)}</ul></div>
          <div className="gate-action"><span>Candidate <Sha>{state.candidate.sha}</Sha></span><button className="promote-button" disabled={gate.status !== 'READY' || state.role !== 'human'} onClick={promote}>PROMOVER A STABLE</button><small>Local simulation only. Gate is recomputed on click.</small></div>
        </section>

        <section className="history-section" id="history">
          <div className="section-heading"><div><Eyebrow>05 / EXECUTABLE RECORD</Eyebrow><h2>HISTORY</h2></div><p>FAILED é evidência.<br />A STABLE permanece preservada.</p></div>
          <div className="history-list">{state.history.map((cycle) => <article className={`history-card history-card--${cycle.result.toLowerCase()}`} key={cycle.id}>
            <div className="history-index">{cycle.result === 'FAILED' ? '×' : '✓'}</div><div className="history-main"><Status value={cycle.result === 'PROMOTED' ? 'PASS' : 'FAIL'} /><h3>{cycle.cycle}</h3><p>{cycle.intent}</p></div>
            <dl><div><dt>Candidate</dt><dd><Sha>{cycle.candidateSha}</Sha></dd></div><div><dt>Stable preserved</dt><dd><Sha>{cycle.stableSha ?? 'MISSING'}</Sha></dd></div></dl>
            <div className="history-outcome"><strong>{cycle.result}</strong>{cycle.failureReason && <p>{cycle.failureReason}</p>}<span>{cycle.budget.usage.files} / {cycle.budget.limits.maxFiles} files</span></div>
          </article>)}</div>
        </section>
      </main>

      <footer className="footer"><p>GILGAL é um protocolo para agentes de IA programarem sem destruir a última versão boa, usando o código estável anterior como memória e prova de comportamento.</p><button className="text-button" onClick={confirmReset}>Reset Demo</button></footer>
    </div>
  );
}
