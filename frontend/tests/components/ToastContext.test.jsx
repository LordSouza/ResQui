import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../../src/components/ToastContext';

function wrapper({ children }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe('ToastContext', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('começa com lista vazia', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('addToast adiciona um toast com kind error por padrão', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => result.current.addToast('Algo deu errado'));
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Algo deu errado');
    expect(result.current.toasts[0].kind).toBe('error');
  });

  it('removeToast remove o toast pelo id', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => result.current.addToast('Erro X'));
    const id = result.current.toasts[0].id;
    act(() => result.current.removeToast(id));
    expect(result.current.toasts).toHaveLength(0);
  });

  it('toast é removido automaticamente após 5000ms', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => result.current.addToast('Auto-remove'));
    expect(result.current.toasts).toHaveLength(1);
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.toasts).toHaveLength(0);
  });

  it('mantém no máximo 5 toasts — o mais antigo é removido', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      for (let i = 0; i < 6; i++) result.current.addToast(`Erro ${i}`);
    });
    expect(result.current.toasts).toHaveLength(5);
    expect(result.current.toasts[0].message).toBe('Erro 1');
  });

  it('useToast lança se usado fora do provider', () => {
    expect(() => renderHook(() => useToast())).toThrow('useToast must be used within ToastProvider');
  });
});
