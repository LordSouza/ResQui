import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardScreen } from '../../src/screens/DashboardScreen';
import { initialState } from '../../src/store/reducer';

describe('DashboardScreen', () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the page title', () => {
    render(<DashboardScreen state={initialState} dispatch={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('shows the hardcoded inventory count of 847', () => {
    render(<DashboardScreen state={initialState} dispatch={vi.fn()} />);
    expect(screen.getByText('847')).toBeInTheDocument();
  });

  it('shows no NaN or undefined in rendered output', () => {
    const { container } = render(<DashboardScreen state={initialState} dispatch={vi.fn()} />);
    expect(container.textContent).not.toContain('NaN');
    expect(container.textContent).not.toContain('undefined');
  });

  it('shows KPI labels', () => {
    render(<DashboardScreen state={initialState} dispatch={vi.fn()} />);
    expect(screen.getByText(/Vencimento/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Resíduos aguardando/i).length).toBeGreaterThan(0);
  });
});
