import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '../../src/components/ToastContext';
import { ToastContainer } from '../../src/components/ToastContainer';

function renderWithProvider(ui) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

import { useToast } from '../../src/components/ToastContext';
import { act } from '@testing-library/react';

function Trigger({ message }) {
  const { addToast } = useToast();
  return <button onClick={() => addToast(message)}>add</button>;
}

describe('ToastContainer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('não renderiza nada quando não há toasts', () => {
    const { container } = renderWithProvider(<ToastContainer />);
    expect(container.querySelector('.toast-container')).toBeNull();
  });

  it('renderiza a mensagem do toast', () => {
    renderWithProvider(<><Trigger message="Senha inválida" /><ToastContainer /></>);
    act(() => { fireEvent.click(screen.getByText('add')); });
    expect(screen.getByText('Senha inválida')).toBeInTheDocument();
  });

  it('botão × fecha o toast', () => {
    renderWithProvider(<><Trigger message="Erro qualquer" /><ToastContainer /></>);
    act(() => { fireEvent.click(screen.getByText('add')); });
    const closeBtn = screen.getByRole('button', { name: 'Fechar' });
    act(() => { fireEvent.click(closeBtn); });
    expect(screen.queryByText('Erro qualquer')).not.toBeInTheDocument();
  });

  it('container tem role region e aria-live polite', () => {
    renderWithProvider(<><Trigger message="X" /><ToastContainer /></>);
    act(() => { fireEvent.click(screen.getByText('add')); });
    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });
});
