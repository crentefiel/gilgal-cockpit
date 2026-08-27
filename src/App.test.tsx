import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GilgalAdapter } from './adapters/GilgalAdapter';
import { App } from './App';
import { freshDemoData } from './demo/demoData';
import { GilgalStateProvider } from './state/GilgalStateProvider';

describe('Cockpit UI', () => {
  it('renders all five primary areas in Local Demo Mode', () => {
    const data = freshDemoData();
    const adapter: GilgalAdapter = { load: () => data, save: () => undefined, reset: () => freshDemoData() };
    const { container } = render(<GilgalStateProvider adapter={adapter}><App /></GilgalStateProvider>);
    expect(container.textContent).toContain('LOCAL DEMO MODE');
    const headings = [...container.querySelectorAll('h2')].map((element) => element.textContent);
    expect(headings).toEqual(expect.arrayContaining(['STABLE', 'CANDIDATE / WORK', 'SENTINEL', 'GATE', 'HISTORY']));
  });
});
