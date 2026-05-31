// frontend/tests/unit/api.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiFetch } from '../../src/lib/api';

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    data: {},
    setItem(k, v) { this.data[k] = String(v); },
    getItem(k) { return this.data[k] ?? null; },
    removeItem(k) { delete this.data[k]; },
    clear() { this.data = {}; },
  });
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe('apiFetch', () => {
  it('retorna resposta quando ok', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 1 }) });
    const res = await apiFetch('/api/test');
    expect(res.ok).toBe(true);
  });

  it('lança com campo message do body quando !ok', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 400,
      json: async () => ({ message: 'Senha muito curta' }),
    });
    await expect(apiFetch('/api/test', { method: 'POST' })).rejects.toThrow('Senha muito curta');
  });

  it('lança com campo title quando não há message', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 422,
      json: async () => ({ title: 'Validation Error' }),
    });
    await expect(apiFetch('/api/test', { method: 'POST' })).rejects.toThrow('Validation Error');
  });

  it('lança com errors[] concatenado quando presente', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 400,
      json: async () => ({ errors: ['Campo obrigatório', 'Formato inválido'] }),
    });
    await expect(apiFetch('/api/test', { method: 'POST' })).rejects.toThrow('Campo obrigatório; Formato inválido');
  });

  it('lança com fallback quando body não tem campos conhecidos', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 500,
      json: async () => ({}),
    });
    await expect(apiFetch('/api/test')).rejects.toThrow('Erro desconhecido (HTTP 500)');
  });

  it('lança com fallback quando body não é JSON', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 503,
      json: async () => { throw new SyntaxError('not json'); },
      text: async () => '',
    });
    await expect(apiFetch('/api/test')).rejects.toThrow('Erro desconhecido (HTTP 503)');
  });

  it('lança Unauthorized e dispara auth:unauthorized no 401 com token', async () => {
    localStorage.setItem('resqui_token', 'abc');
    const listener = vi.fn();
    window.addEventListener('auth:unauthorized', listener);
    fetch.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(apiFetch('/api/test')).rejects.toThrow('Unauthorized');
    expect(listener).toHaveBeenCalled();
    window.removeEventListener('auth:unauthorized', listener);
  });

  it('adds Authorization header when token exists', async () => {
    localStorage.setItem('resqui_token', 'my-jwt');
    fetch.mockResolvedValueOnce({ ok: true, status: 200 });
    await apiFetch('/api/test');
    expect(fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer my-jwt' }),
    }));
  });

  it('appends query params when params option is provided', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200 });
    await apiFetch('/api/reagentes', { params: { q: 'acido', page: 1 } });
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('/api/reagentes?');
    expect(url).toContain('page=1');
  });
});
