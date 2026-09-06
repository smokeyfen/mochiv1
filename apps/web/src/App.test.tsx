import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('shows the feasibility lock as blocked', () => {
    render(<App />);
    expect(screen.getByText('FEN V1 Feasibility Lock')).toBeInTheDocument();
    expect(screen.getAllByText('BLOCKED').length).toBeGreaterThan(0);
  });
});
