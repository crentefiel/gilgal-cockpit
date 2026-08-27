import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('baseline', () => {
  it('identifica o GILGAL Cockpit', () => {
    render(<App />);
    expect(screen.getByText('GILGAL Cockpit')).toBeInTheDocument();
  });
});

