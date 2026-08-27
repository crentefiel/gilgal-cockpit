import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GilgalAdapter } from './adapters/GilgalAdapter';
import { App } from './App';
import { freshDemoData } from './demo/demoData';
import { decideHumanCheck, setCandidateSha } from './domain/operations';
import type { CockpitData } from './domain/types';
import { GilgalStateProvider } from './state/GilgalStateProvider';

function renderCockpit(data: CockpitData) {
  const adapter: GilgalAdapter = { load: () => data, save: () => undefined, reset: () => freshDemoData() };
  return render(<GilgalStateProvider adapter={adapter}><App /></GilgalStateProvider>);
}

describe('GILGAL Cockpit operational UX contracts', () => {
  it('COCKPIT-UX-01 Gate appears before Sentinel details', () => {
    const { container } = renderCockpit(freshDemoData());
    const gate = container.querySelector('[data-section="gate"]')!;
    const sentinel = container.querySelector('[data-section="sentinel-details"]')!;
    expect(gate.compareDocumentPosition(sentinel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('COCKPIT-UX-02 current pending reason is visible without opening details', () => {
    const { container } = renderCockpit(freshDemoData());
    const primary = container.querySelector('[data-section="attention"]')!;
    expect(primary.textContent).toContain('Human visual check');
    expect(primary.textContent).toContain('PENDING');
    expect(container.querySelector('details[open]')).toBeNull();
  });

  it('COCKPIT-UX-03 STABLE and CANDIDATE SHAs are visible in primary cycle summary', () => {
    const { container } = renderCockpit(freshDemoData());
    const summary = container.querySelector('[data-section="cycle-summary"]')!;
    expect(summary.textContent).toContain('81c728e');
    expect(summary.textContent).toContain('b73ad42');
  });

  it('COCKPIT-UX-04 Human Check PENDING is visible in the primary summary', () => {
    const { container } = renderCockpit(freshDemoData());
    const attention = container.querySelector('[data-section="attention"]')!;
    expect(attention.textContent).toMatch(/Human visual check[\s\S]*PENDING/);
  });

  it('COCKPIT-UX-05 Agent role cannot approve Human Check', () => {
    const data = { ...freshDemoData(), role: 'agent' as const };
    const { container } = renderCockpit(data);
    const approve = [...container.querySelectorAll('button')].find((button) => button.textContent === 'APROVAR');
    expect(approve).toBeDisabled();
    expect(container.querySelector('[data-section="gate"]')?.textContent).toContain('AGENT não pode aprovar');
  });

  it('COCKPIT-UX-06 Demo tools are visually separated from operational actions', () => {
    const { container } = renderCockpit(freshDemoData());
    const tools = container.querySelector('[data-section="demo-tools"]')!;
    expect(tools.tagName).toBe('DETAILS');
    expect(tools.textContent).toContain('Simular mudança de SHA');
    expect(container.querySelector('[data-section="gate"]')?.textContent).not.toContain('Simular mudança de SHA');
  });

  it('COCKPIT-UX-07 READY ≠ PROMOTED remains visible', () => {
    const ready = decideHumanCheck(freshDemoData(), 'human-visual', 'PASS').state;
    const { container } = renderCockpit(ready);
    const gate = container.querySelector('[data-section="gate"]')!;
    expect(gate.textContent).toContain('READY ≠ PROMOTED');
    expect(gate.textContent).toContain('PROMOVER A STABLE');
  });

  it('COCKPIT-UX-08 critical FAIL remains visible without expanding Sentinel', () => {
    const data = freshDemoData();
    data.checks[0].status = 'FAIL';
    const { container } = renderCockpit(data);
    expect(container.querySelector('[data-section="attention"]')?.textContent).toMatch(/Typecheck[\s\S]*FAIL/);
    expect(container.querySelector('details[open]')).toBeNull();
  });

  it('COCKPIT-UX-09 exceeded budget appears in the primary attention area', () => {
    const data = freshDemoData();
    data.candidate.usage.files = data.budget.maxFiles + 1;
    const { container } = renderCockpit(data);
    expect(container.querySelector('[data-section="attention"]')?.textContent).toContain('SCOPE EXPANSION DETECTED');
  });

  it('COCKPIT-UX-10 STALE approval appears in the primary attention area', () => {
    const approved = decideHumanCheck(freshDemoData(), 'human-visual', 'PASS').state;
    const stale = setCandidateSha(approved, 'def456a').state;
    const { container } = renderCockpit(stale);
    const attention = container.querySelector('[data-section="attention"]')!;
    expect(attention.textContent).toContain('STALE');
    expect(attention.textContent).toContain('Aprovação ligada ao SHA anterior');
  });
});

