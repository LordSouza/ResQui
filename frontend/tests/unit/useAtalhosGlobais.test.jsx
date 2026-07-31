import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useAtalhosGlobais } from '../../src/lib/useAtalhosGlobais';

function Sonda({ handlers }) {
  useAtalhosGlobais(handlers);
  return <input aria-label="campo" />;
}

function montar(handlers) {
  return render(<Sonda handlers={handlers} />);
}

describe('useAtalhosGlobais', () => {
  afterEach(() => vi.restoreAllMocks());

  it('⌘K chama onBuscar', () => {
    const onBuscar = vi.fn();
    montar({ onBuscar });

    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    expect(onBuscar).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+K também chama onBuscar', () => {
    const onBuscar = vi.fn();
    montar({ onBuscar });

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(onBuscar).toHaveBeenCalledTimes(1);
  });

  it('? chama onAtalhos', () => {
    const onAtalhos = vi.fn();
    montar({ onAtalhos });

    fireEvent.keyDown(window, { key: '?' });

    expect(onAtalhos).toHaveBeenCalledTimes(1);
  });

  it('⌘/ chama onChat', () => {
    const onChat = vi.fn();
    montar({ onChat });

    fireEvent.keyDown(window, { key: '/', metaKey: true });

    expect(onChat).toHaveBeenCalledTimes(1);
  });

  it('Esc chama onEscape', () => {
    const onEscape = vi.fn();
    montar({ onEscape });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('? dentro de um campo de texto não dispara', () => {
    const onAtalhos = vi.fn();
    const { getByLabelText } = montar({ onAtalhos });
    getByLabelText('campo').focus();

    fireEvent.keyDown(window, { key: '?' });

    expect(onAtalhos).not.toHaveBeenCalled();
  });

  it('⌘K dentro de um campo de texto dispara', () => {
    const onBuscar = vi.fn();
    const { getByLabelText } = montar({ onBuscar });
    getByLabelText('campo').focus();

    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    expect(onBuscar).toHaveBeenCalledTimes(1);
  });

  it('remove o listener ao desmontar', () => {
    const onAtalhos = vi.fn();
    const { unmount } = montar({ onAtalhos });
    unmount();

    fireEvent.keyDown(window, { key: '?' });

    expect(onAtalhos).not.toHaveBeenCalled();
  });
});
