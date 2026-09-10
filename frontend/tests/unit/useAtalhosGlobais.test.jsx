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

  it('⌘/ chama onChat', () => {
    const onChat = vi.fn();
    montar({ onChat });

    fireEvent.keyDown(window, { key: '/', metaKey: true });

    expect(onChat).toHaveBeenCalledTimes(1);
  });

  it('? não dispara nada — a tela que ele abria não existe mais', () => {
    const onChat = vi.fn();
    montar({ onChat });

    fireEvent.keyDown(window, { key: '?' });

    expect(onChat).not.toHaveBeenCalled();
  });

  it('⌘K não dispara nada — a busca global que ele focava não existe mais', () => {
    const onChat = vi.fn();
    montar({ onChat });

    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    expect(onChat).not.toHaveBeenCalled();
  });

  it('⌘/ dentro de um campo de texto dispara (precisa fechar o chat a partir do próprio textarea)', () => {
    const onChat = vi.fn();
    const { getByLabelText } = montar({ onChat });
    getByLabelText('campo').focus();

    fireEvent.keyDown(window, { key: '/', metaKey: true });

    expect(onChat).toHaveBeenCalledTimes(1);
  });

  it('remove o listener ao desmontar', () => {
    const onChat = vi.fn();
    const { unmount } = montar({ onChat });
    unmount();

    fireEvent.keyDown(window, { key: '/', metaKey: true });

    expect(onChat).not.toHaveBeenCalled();
  });
});
