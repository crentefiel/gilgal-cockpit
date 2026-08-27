import { effectiveCheckStatus, isBudgetExceeded } from './domain/gate';
import type { CheckStatus, GilgalCheck, ComparativeGateStatus } from './domain/types';
import { useGilgal } from './state/GilgalStateProvider';
import { useState } from 'react';

type DisplayStatus = CheckStatus | 'READY' | 'BLOCKED';

function Status({ value }: { value: DisplayStatus }) {
  return <span className={`status status--${value.toLowerCase().replace('_', '-')}`}>{value.replace('_', ' ')}</span>;
}

function Sha({ children }: { children: string }) {
  return <code className="sha">{children}</code>;
}

function ProtocolLabel({ children }: { children: React.ReactNode }) {
  return <p className="protocol-label">{children}</p>;
}

function CheckLine({ check }: { check: GilgalCheck }) {
  const { state } = useGilgal();
  if (!state) return null;
  const status = effectiveCheckStatus(check, state);
  return (
    <article className="check-line">
      <div>
        <span className="check-kind">{check.kind}</span>
        <strong>{check.label}</strong>
        {check.evidence?.summary && <p>{check.evidence.summary}</p>}
      </div>
      <div className="check-evidence">
        {check.evidence?.command && <code>{check.evidence.command}</code>}
        <Sha>{state.candidate.sha}</Sha>
        <Status value={status} />
      </div>
    </article>
  );
}

function BudgetLine({ label, used, limit }: { label: string; used: number; limit: number }) {
  const exceeded = used > limit;
  const width = limit === 0 ? (used ? 100 : 0) : Math.min((used / limit) * 100, 100);
  return (
    <div className={`budget-line ${exceeded ? 'budget-line--failed' : ''}`}>
      <div><span>{label}</span><strong>{used} / {limit}</strong></div>
      <div className="budget-bar"><i style={{ width: `${width}%` }} /></div>
    </div>
  );
}

export function App() {
  const { state, gate, notice, mode, project, busy, setRole, decideHuman, decideHumanDecision, changeBudget, simulateShaChange, promote, reset, refreshEvidence, runSentinel } = useGilgal();
  const isLive = mode === 'live';
  const isLoading = mode === 'loading';
  const [failReason, setFailReason] = useState('');

  if (isLoading || !state || !gate) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div className="brand"><span className="brand-mark">G</span><div><strong>GILGAL COCKPIT</strong><p>A última versão boa permanece protegida.</p></div></div>
          <span className="demo-badge"><i /> CONECTANDO AO PROJETO REAL...</span>
        </header>
        <main>
          <section className="project-bar" data-section="project-connection">
            <div className="loading-skeleton">
              <div className="skeleton-line skeleton-title"></div>
              <div className="skeleton-line skeleton-text"></div>
              <div className="skeleton-line skeleton-text short"></div>
            </div>
            <p className="operation-notice" role="status">{notice}</p>
          </section>
          <section className="decision-center decision-center--pending" data-section="gate">
            <div className="loading-skeleton">
              <div className="skeleton-line skeleton-title"></div>
              <div className="skeleton-line skeleton-text"></div>
              <div className="skeleton-line skeleton-text"></div>
            </div>
          </section>
          <section className="cycle-overview" data-section="cycle-summary">
            <div className="loading-skeleton">
              <article className="skeleton-card"><div className="skeleton-line skeleton-title"></div><div className="skeleton-line"></div><div className="skeleton-line"></div></article>
              <article className="skeleton-card"><div className="skeleton-line skeleton-title"></div><div className="skeleton-line"></div><div className="skeleton-line"></div></article>
              <article className="skeleton-card"><div className="skeleton-line skeleton-title"></div><div className="skeleton-line"></div><div className="skeleton-line"></div></article>
            </div>
          </section>
        </main>
        <footer><strong>CARREGANDO EVIDÊNCIA REAL...</strong><p>Aguardando dados do Sentinel do projeto conectado.</p></footer>
      </div>
    );
  }

  const checks = state.checks.map((check) => ({ check, status: effectiveCheckStatus(check, state) }));
  const attentionChecks = checks.filter(({ status }) => status !== 'PASS');
  const passCount = checks.filter(({ status }) => status === 'PASS').length;
  const failCount = checks.filter(({ status }) => status === 'FAIL').length;
  const pendingCount = checks.filter(({ status }) => ['PENDING', 'NOT_TESTED', 'STALE'].includes(status)).length;
  const budgetExceeded = isBudgetExceeded(state.budget, state.candidate.usage);
  const humanCheck = checks.find(({ check }) => check.kind === 'HUMAN');
  const memoryRegressions = state.memory.filter((contract) => contract.stableStatus === 'PASS' && contract.candidateStatus === 'FAIL');
  const replayFailures = state.replays.filter((replay) => replay.candidateStatus === 'FAIL');

  const gateMessage = gate.status === 'READY'
    ? 'Todas as verificações obrigatórias do SHA atual passaram.'
    : gate.status === 'BLOCKED'
      ? 'A promoção foi recusada. Corrija o bloqueio antes de continuar.'
      : humanCheck?.status === 'STALE'
        ? 'A aprovação anterior venceu porque o SHA do CANDIDATE mudou.'
        : 'Ainda falta uma verificação obrigatória para o SHA atual.';

  const setLimit = (key: keyof typeof state.budget, value: string) => {
    changeBudget({ ...state.budget, [key]: Number(value) });
  };

  const confirmReset = () => {
    if (window.confirm('Resetar todos os dados locais da demonstração?')) reset();
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand"><span className="brand-mark">G</span><div><strong>GILGAL COCKPIT</strong><p>A última versão boa permanece protegida.</p></div></div>
        <span className={`demo-badge ${isLive ? 'demo-badge--live' : ''}`}><i /> {isLive ? 'PROJETO REAL CONECTADO' : 'LOCAL DEMO MODE'}</span>
      </header>

      <main>
        <section className={`project-bar ${isLive ? 'project-bar--live' : ''}`} data-section="project-connection">
          <div><ProtocolLabel>PROJETO EM VALIDAÇÃO</ProtocolLabel><strong>{isLive ? project?.name : 'Demonstração local'}</strong><code>{isLive ? project?.path : 'Dados fictícios para testes internos'}</code></div>
          <div className="project-meta">{isLive && <><span>BRANCH <Sha>{project?.branch ?? '—'}</Sha></span><span>WORKTREE <b>{project?.dirty ? 'ALTERADA' : 'LIMPA'}</b></span></>}</div>
          <div className="project-actions">
            {isLive && <a className="secondary-link" href={project?.gameUrl} target="_blank" rel="noreferrer">{project?.openLabel ?? 'ABRIR PROJETO'}</a>}
            <button className="secondary-action" disabled={busy || !isLive} onClick={() => void refreshEvidence()}>ATUALIZAR</button>
            <button className="primary-action" disabled={busy || !isLive} onClick={() => void runSentinel()}>{busy ? 'EXECUTANDO...' : 'EXECUTAR SENTINEL'}</button>
          </div>
          <p className="operation-notice" role="status">{notice}</p>
        </section>

        <section className={`decision-center decision-center--${gate.status.toLowerCase()}`} data-section="gate">
          <div className="decision-main">
            <ProtocolLabel>GATE · DECISÃO DE PROMOÇÃO</ProtocolLabel>
            <div className="decision-status"><Status value={gate.status} /><span>Candidate <Sha>{state.candidate.sha}</Sha></span></div>
            <h1>{gateMessage}</h1>
            <p className="decision-explanation">
              {gate.status === 'READY'
                ? 'O CANDIDATE pode ser submetido à decisão humana de promoção.'
                : `O CANDIDATE ${state.candidate.sha} ainda não pode virar STABLE.`}
            </p>
            <p className="ready-rule">READY ≠ PROMOTED</p>
          </div>

          <div className="decision-actions">
            {gate.status === 'READY' ? (
              isLive ? <><span className="action-title">Gate READY para o SHA atual.</span><button className="primary-action" disabled>PROMOÇÃO GIT EXIGE REVISÃO</button></> : <button className="primary-action" disabled={state.role !== 'human'} onClick={promote}>PROMOVER A STABLE</button>
            ) : humanCheck && ['PENDING', 'STALE'].includes(humanCheck.status) ? (
              <>
                <span className="action-title">Revisão humana necessária</span>
                {isLive && <a className="game-check-link" href={project?.gameUrl} target="_blank" rel="noreferrer">1. ABRIR E TESTAR {project?.name?.toUpperCase()}</a>}
                <div>
                  <button className="primary-action" disabled={busy || state.role === 'agent'} onClick={() => decideHuman('PASS')}>{isLive ? '2. APROVAR ESTE SHA' : 'APROVAR'}</button>
                  <button className="secondary-action" disabled={busy || state.role === 'agent'} onClick={() => decideHumanDecision(humanCheck.check.id, 'FAIL', failReason || undefined)}>REPROVAR</button>
                </div>
                {!isLive && (
                  <div className="fail-reason-input">
                    <label>
                      Justificativa (opcional):
                      <input type="text" value={failReason} onChange={(e) => setFailReason(e.target.value)} placeholder="Motivo da reprovação..." />
                    </label>
                  </div>
                )}
                {state.role === 'agent' && <small>O AGENT não pode aprovar este Human Check.</small>}
              </>
            ) : (
              <span className="blocked-action">Promoção indisponível enquanto houver falha crítica.</span>
            )}
            <small>{isLive ? 'A aprovação é gravada pelo Sentinel e vinculada aos SHAs atuais. A promoção Git não é automática.' : 'A ação é apenas uma simulação local. Nenhum Git será modificado.'}</small>
          </div>
        </section>

        <section className="cycle-overview" data-section="cycle-summary">
          <article className="version-card version-card--stable">
            <div><ProtocolLabel>STABLE</ProtocolLabel><span>Última versão boa verificada</span></div>
            <Sha>{state.stable.sha}</Sha>
            <dl><div><dt>Ciclo</dt><dd>{state.stable.cycle}</dd></div><div><dt>Contratos</dt><dd>{state.stable.verifiedContracts} verificados</dd></div></dl>
            <strong className="protected-label">PROTEGIDA</strong>
          </article>

          <article className="version-card version-card--candidate">
            <div><ProtocolLabel>CANDIDATE</ProtocolLabel><span>Versão isolada em desenvolvimento</span></div>
            <Sha>{state.candidate.sha}</Sha>
            <dl><div><dt>Intenção</dt><dd>{state.candidate.intent}</dd></div><div><dt>Base STABLE</dt><dd>{state.candidate.baseStableSha}</dd></div></dl>
            <Status value={gate.status} />
          </article>

          <article className="cycle-summary">
            <ProtocolLabel>RESUMO DO CICLO</ProtocolLabel>
            <div className="summary-numbers"><span><strong>{passCount}</strong> PASS</span><span><strong>{pendingCount}</strong> PENDING</span><span><strong>{failCount}</strong> FAIL</span></div>
            <dl>
              <div><dt>Linhas alteradas</dt><dd>{state.candidate.usage.changedLines} / {state.budget.maxChangedLines}</dd></div>
              <div><dt>Change Budget</dt><dd>{budgetExceeded ? 'EXCEDIDO' : 'DENTRO DO LIMITE'}</dd></div>
              <div><dt>Gate</dt><dd>{gate.status}</dd></div>
            </dl>
          </article>
        </section>

        <section className="attention" data-section="attention">
          <div className="section-title"><div><ProtocolLabel>PRECISA DE ATENÇÃO</ProtocolLabel><h2>O que falta para promover?</h2></div><span>{attentionChecks.length + (budgetExceeded ? 1 : 0)} item(ns)</span></div>
          <div className="attention-list">
            {budgetExceeded && <article className="attention-item attention-item--fail"><span>!</span><div><strong>CHANGE BUDGET</strong><p>SCOPE EXPANSION DETECTED</p></div><Status value="FAIL" /></article>}
            {attentionChecks.map(({ check, status }) => <article className={`attention-item attention-item--${status === 'FAIL' ? 'fail' : 'pending'}`} key={check.id}><span>{status === 'FAIL' ? '!' : '○'}</span><div><strong>{check.label}</strong><p>{status === 'STALE' ? 'Aprovação ligada ao SHA anterior. Verificação humana necessária novamente.' : check.evidence?.summary ?? 'Verificação obrigatória ainda não concluída.'}</p><Sha>{state.candidate.sha}</Sha></div><Status value={status} /></article>)}
            {!attentionChecks.length && !budgetExceeded && <div className="attention-empty"><span>✓</span><strong>Nenhuma pendência obrigatória.</strong></div>}
          </div>
          <div className="passed-strip"><span>Verificações concluídas</span>{checks.filter(({ status }) => status === 'PASS').map(({ check }) => <span className="pass-chip" key={check.id}>✓ {check.label}</span>)}{!budgetExceeded && <span className="pass-chip">✓ Change Budget</span>}</div>
        </section>

        <section className="technical" data-section="sentinel-details">
          <div className="section-title"><div><ProtocolLabel>SEGUNDO NÍVEL</ProtocolLabel><h2>Evidências técnicas</h2><p>Abra somente quando precisar investigar por que o Gate decidiu.</p></div></div>

          <details className="detail-panel">
            <summary><span><strong>SENTINEL</strong><small>Code Check, testes, runtime e Human Check</small></span><span>{passCount}/{checks.length} PASS</span></summary>
            <div className="detail-content">{state.checks.map((check) => <CheckLine check={check} key={check.id} />)}</div>
          </details>

          <details className={`detail-panel ${memoryRegressions.length ? 'detail-panel--danger' : ''}`}>
            <summary><span><strong>EXECUTABLE MEMORY</strong><small>Comparação STABLE × CANDIDATE</small></span><span>{state.memory.length} preservados · {memoryRegressions.length} regressões</span></summary>
            {memoryRegressions.length > 0 && <div className="critical-banner">REGRESSION DETECTED</div>}
            <div className="detail-content memory-table">
              <div className="memory-row memory-row--head"><span>CONTRATO</span><span>STABLE</span><span>CANDIDATE</span></div>
              {state.memory.map((contract) => <div className="memory-row" key={contract.id}><strong>{contract.label}</strong><Status value={contract.stableStatus} /><Status value={contract.candidateStatus} /></div>)}
            </div>
          </details>

          <details className={`detail-panel ${replayFailures.length ? 'detail-panel--danger' : ''}`}>
            <summary><span><strong>REGRESSION REPLAY</strong><small>Memória executável de falhas antigas</small></span><span>{state.replays.length} replays · {replayFailures.length} FAIL</span></summary>
            {replayFailures.some((replay) => replay.critical) && <div className="critical-banner">CRITICAL REPLAY FAILED</div>}
            <div className="detail-content replay-list">{state.replays.map((replay) => <article key={replay.id}><div><code>{replay.id}</code><Status value={replay.candidateStatus} /></div><p>{replay.pastRegression}</p><small>STABLE <Status value={replay.stableStatus} /> · CANDIDATE <Status value={replay.candidateStatus} /></small></article>)}</div>
          </details>

          <details className={`detail-panel ${budgetExceeded ? 'detail-panel--danger' : ''}`}>
            <summary><span><strong>CHANGE BUDGET</strong><small>Limite de escopo definido antes do trabalho</small></span><span>{budgetExceeded ? 'SCOPE EXPANSION DETECTED' : 'WITHIN BUDGET'}</span></summary>
            {budgetExceeded && <div className="critical-banner">SCOPE EXPANSION DETECTED</div>}
            <div className="detail-content budget-detail">
              <div><BudgetLine label="Files" used={state.candidate.usage.files} limit={state.budget.maxFiles} /><BudgetLine label="Insertions" used={state.candidate.usage.insertions} limit={state.budget.maxInsertions} /><BudgetLine label="Deletions" used={state.candidate.usage.deletions} limit={state.budget.maxDeletions} /><BudgetLine label="Changed lines" used={state.candidate.usage.changedLines} limit={state.budget.maxChangedLines} /></div>
              <div className="budget-controls"><span>Budget owner: HUMAN</span>{Object.entries(state.budget).map(([key, value]) => <label key={key}>{key.replace('max', '')}<input aria-label={key} type="number" min="0" value={value} disabled={isLive || state.role === 'agent'} onChange={(event) => setLimit(key as keyof typeof state.budget, event.target.value)} /></label>)}{isLive && <small>No modo real, altere o orçamento revisando gilgal.sentinel.json antes do ciclo.</small>}</div>
            </div>
          </details>
        </section>

        {!isLive && <details className="demo-tools" data-section="demo-tools">
          <summary><span><strong>Ferramentas da demonstração</strong><small>Estas ações não fazem parte do fluxo operacional real.</small></span></summary>
          <div className="demo-tools__content">
            <div><span>DEMO ROLE</span><div className="role-switch"><button className={state.role === 'human' ? 'active' : ''} onClick={() => setRole('human')}>HUMAN</button><button className={state.role === 'agent' ? 'active' : ''} onClick={() => setRole('agent')}>AGENT</button></div><small>Simula permissões; não é login.</small></div>
            <button className="tool-button" onClick={simulateShaChange}>Simular mudança de SHA</button>
            <button className="tool-button" onClick={confirmReset}>Reset Demo</button>
            <p>{notice}</p>
          </div>
        </details>}

        <section className="investigation" data-section="investigation">
          <div className="section-title"><div><ProtocolLabel>INVESTIGAÇÃO</ProtocolLabel><h2>GILGAL 0.4 — Investigação Ativa</h2><p>Registro estruturado de hipóteses, famílias de estratégia e memória de falhas.</p></div></div>

          <div className="investigation-grid">
            <article className="investigation-card">
              <ProtocolLabel>PROBLEMA</ProtocolLabel>
              {state.problems.length > 0 ? (
                <div className="problem-list">
                  {state.problems.map((p) => (
                    <div key={p.id} className="problem-item">
                      <strong>{p.id}</strong>: {p.title}
                      {p.description && <p>{p.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">Nenhum problema registrado. Use o ledger para iniciar uma investigação.</p>
              )}
            </article>

            <article className="investigation-card">
              <ProtocolLabel>HIPÓTESE ATIVA</ProtocolLabel>
              {state.hypotheses.filter((h) => h.state === 'ACTIVE').length > 0 ? (
                <div className="hypothesis-list">
                  {state.hypotheses.filter((h) => h.state === 'ACTIVE').map((h) => (
                    <div key={h.id} className="hypothesis-item">
                      <strong>{h.id}</strong> (família: {h.familyId})
                      <p>Claim: {h.claim}</p>
                      <p>Evidência requerida: {h.requiredEvidence.join(', ') || '—'}</p>
                      <small>Candidate: {h.candidateSha} · {h.evidence.length} evidências</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">Nenhuma hipótese ATIVA. Hipóteses CONFIRMED/REJECTED/INCONCLUSIVE não aparecem aqui.</p>
              )}
            </article>

            <article className="investigation-card">
              <ProtocolLabel>FAMÍLIA DE ESTRATÉGIA</ProtocolLabel>
              {state.candidateFamilies.length > 0 ? (
                <div className="family-list">
                  {state.candidateFamilies.map((f) => (
                    <div key={f.id} className={`family-item family-item--${f.state.toLowerCase()}`}>
                      <div className="family-header">
                        <strong>{f.id}</strong>: {f.name}
                        <Status value={f.state === 'EXHAUSTED' ? 'FAIL' : 'PASS'} />
                      </div>
                      <p>{f.description || 'Sem descrição'}</p>
                      <p>Hipóteses: {f.hypotheses.join(', ') || '—'}</p>
                      {f.state === 'EXHAUSTED' && (
                        <p className="exhausted-notice">
                          <strong>STRATEGY EXHAUSTED</strong>
                          {f.exhaustedReason && <span> — {f.exhaustedReason}</span>}
                          {f.reopenEvidence && <span> · Reaberto com: {f.reopenEvidence}</span>}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">Nenhuma família de estratégia registrada.</p>
              )}
            </article>

            <article className="investigation-card">
              <ProtocolLabel>FAILURE MEMORY</ProtocolLabel>
              {state.failureMemory.length > 0 ? (
                <div className="failure-memory-list">
                  {state.failureMemory.map((fm) => (
                    <div key={fm.id} className="failure-memory-item">
                      <div className="fm-header">
                        <strong>Hypothesis:</strong> {fm.hypothesis}
                        <span className="fm-result">{fm.result}</span>
                      </div>
                      <div><strong>Strategy family:</strong> {fm.family}</div>
                      <div><strong>Result:</strong> {fm.result}</div>
                      <div><strong>Evidence:</strong> {fm.evidence.join('; ') || '—'}</div>
                      <div><strong>Candidate SHA:</strong> <Sha>{fm.candidateSha}</Sha></div>
                      <div><strong>Reason:</strong> {fm.reason}</div>
                      <small>Recorded: {new Date(fm.recordedAt).toLocaleString('pt-BR')}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">Nenhuma entrada na Failure Memory. Hipóteses REJECTED/INCONCLUSIVE são registradas aqui.</p>
              )}
            </article>

            <article className="investigation-card">
              <ProtocolLabel>COMPARATIVE GATE</ProtocolLabel>
              {state.comparativeGate ? (
                <div className="comparative-gate">
                  <div className="cg-status">
                    <Status value={state.comparativeGate.status === 'NO_WINNER' ? 'FAIL' : state.comparativeGate.status === 'PENDING' ? 'PENDING' : 'PASS'} />
                    <span>{state.comparativeGate.status}</span>
                  </div>
                  <p>{state.comparativeGate.reason}</p>
                  {state.comparativeGate.winner && (
                    <div className="cg-winner">
                      <strong>Winner (eligible):</strong> <Sha>{state.comparativeGate.winner.candidateSha}</Sha>
                      <small>Hypothesis: {state.comparativeGate.winner.hypothesisId} · Family: {state.comparativeGate.winner.familyId}</small>
                      <p className="ready-rule">READY ≠ PROMOTED — Human decision still required.</p>
                    </div>
                  )}
                  {state.comparativeGate.eligibleCandidates.length > 0 && (
                    <details>
                      <summary>Eligible candidates ({state.comparativeGate.eligibleCandidates.length})</summary>
                      <ul>{state.comparativeGate.eligibleCandidates.map((c) => <li key={c.candidateSha}><Sha>{c.candidateSha}</Sha> — hypothesis: {c.hypothesisId}</li>)}</ul>
                    </details>
                  )}
                  {state.comparativeGate.ineligibleCandidates.length > 0 && (
                    <details className="ineligible">
                      <summary>Ineligible candidates ({state.comparativeGate.ineligibleCandidates.length})</summary>
                      <ul>{state.comparativeGate.ineligibleCandidates.map((c) => <li key={c.candidateSha}><Sha>{c.candidateSha}</Sha> — {c.ineligibilityReason}</li>)}</ul>
                    </details>
                  )}
                </div>
              ) : (
                <p className="empty-state">Comparative Gate não executado. Use a operação para comparar candidates concorrentes.</p>
              )}
            </article>
          </div>
        </section>

        <section className="history" data-section="history">
          <div className="section-title"><div><ProtocolLabel>HISTORY</ProtocolLabel><h2>Histórico preservado</h2><p>FAILED é evidência. Nenhuma tentativa é apagada silenciosamente.</p></div></div>
          <div className="history-list">{state.history.map((cycle) => <article className={`history-card history-card--${cycle.result.toLowerCase()}`} key={cycle.id}><div><Status value={cycle.result === 'PROMOTED' ? 'PASS' : 'FAIL'} /><h3>{cycle.cycle}</h3><p>{cycle.intent}</p></div><dl><div><dt>Candidate</dt><dd><Sha>{cycle.candidateSha}</Sha></dd></div><div><dt>STABLE preservada</dt><dd><Sha>{cycle.stableSha ?? 'MISSING'}</Sha></dd></div></dl><div><strong>{cycle.result}</strong>{cycle.failureReason && <p>{cycle.failureReason}</p>}<small>{cycle.budget.usage.files} / {cycle.budget.limits.maxFiles} files</small></div></article>)}</div>
        </section>
      </main>

      <footer><strong>{isLive ? 'MODO OPERACIONAL LOCAL' : 'LOCAL DEMO MODE'}</strong><p>{isLive ? `Evidências lidas do Sentinel em ${project?.path}. A STABLE não é promovida automaticamente.` : 'As evidências desta tela são demonstrativas. Nenhum repositório Git é alterado pela interface.'}</p></footer>
    </div>
  );
}
