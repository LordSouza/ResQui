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
      text: async () => JSON.stringify({ message: 'Senha muito curta' }),
    });
    await expect(apiFetch('/api/test', { method: 'POST' })).rejects.toThrow('Senha muito curta');
  });

  it('lança com campo title quando não há message', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 422,
      text: async () => JSON.stringify({ title: 'Validation Error' }),
    });
    await expect(apiFetch('/api/test', { method: 'POST' })).rejects.toThrow('Validation Error');
  });

  it('lança com errors[] concatenado quando presente', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 400,
      text: async () => JSON.stringify({ errors: ['Campo obrigatório', 'Formato inválido'] }),
    });
    await expect(apiFetch('/api/test', { method: 'POST' })).rejects.toThrow('Campo obrigatório; Formato inválido');
  });

  it('lança com fallback quando body não tem campos conhecidos', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 500,
      text: async () => JSON.stringify({}),
    });
    await expect(apiFetch('/api/test')).rejects.toThrow('Erro desconhecido (HTTP 500)');
  });

  it('lança mensagem de indisponibilidade quando 503 vem sem corpo', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 503,
      text: async () => '',
    });
    await expect(apiFetch('/api/test')).rejects.toThrow('O servidor está indisponível ou demorou demais para responder.');
  });

  it('não mostra a página HTML de erro do proxy: 502/504 viram mensagem de indisponibilidade', async () => {
    for (const status of [502, 504]) {
      fetch.mockResolvedValueOnce({
        ok: false, status,
        text: async () => '<html><body><h1>504 Gateway Time-out</h1></body></html>',
      });
      const err = await apiFetch('/api/test').catch(e => e);
      expect(err.message).toBe('O servidor está indisponível ou demorou demais para responder. Tente novamente em instantes.');
      expect(err.status).toBe(status);
    }
  });

  it('504 num POST avisa para conferir se a operação foi registrada antes de repetir', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 504,
      text: async () => '<html><body><h1>504 Gateway Time-out</h1></body></html>',
    });
    const err = await apiFetch('/api/reagentes/importar-lote', { method: 'POST' }).catch(e => e);
    expect(err.message).toBe('O servidor demorou demais para responder. Confira se a operação foi registrada antes de repeti-la.');
  });

  it('413 com corpo HTML vira mensagem de envio grande demais', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 413,
      text: async () => '<html><body>413 Request Entity Too Large</body></html>',
    });
    await expect(apiFetch('/api/test', { method: 'POST' })).rejects.toThrow('O envio é grande demais para o servidor.');
  });

  it('outro status com corpo não-JSON cai no genérico, sem o corpo cru', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 500,
      text: async () => '<html>Internal Server Error</html>',
    });
    await expect(apiFetch('/api/test')).rejects.toThrow(/^Erro desconhecido \(HTTP 500\)$/);
  });

  it('traduz falha de rede (TypeError do fetch) para mensagem em pt-BR', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(apiFetch('/api/test')).rejects.toThrow(
      'Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.'
    );
  });

  describe('timeout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      fetch.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      }));
    });
    afterEach(() => vi.useRealTimers());

    it('GET sem resposta em 30 s lança mensagem de timeout simples', async () => {
      const p = apiFetch('/api/test');
      const check = expect(p).rejects.toThrow(/^O servidor não respondeu a tempo. Tente novamente.$/);
      await vi.advanceTimersByTimeAsync(30_000);
      await check;
    });

    it('não-GET sem resposta pede para conferir se a operação foi registrada', async () => {
      const p = apiFetch('/api/test', { method: 'POST' });
      const check = expect(p).rejects.toThrow('Confira se a operação foi registrada antes de repeti-la.');
      await vi.advanceTimersByTimeAsync(30_000);
      await check;
    });

    it('não aborta antes dos 30 s', async () => {
      const p = apiFetch('/api/test');
      let rejeitou = false;
      p.catch(() => { rejeitou = true; });
      await vi.advanceTimersByTimeAsync(29_999);
      expect(rejeitou).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(rejeitou).toBe(true);
    });

    it('abort do chamador propaga o AbortError original, sem virar mensagem de timeout', async () => {
      const controller = new AbortController();
      const p = apiFetch('/api/test', { signal: controller.signal });
      controller.abort();
      const err = await p.catch(e => e);
      expect(err.name).toBe('AbortError');
    });
  });

  it('NÃO dispara auth:unauthorized no 401 sem token', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 401 });
    const listener = vi.fn();
    window.addEventListener('auth:unauthorized', listener);
    await expect(apiFetch('/api/test')).rejects.toThrow('Unauthorized');
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener('auth:unauthorized', listener);
  });

  it('define Content-Type: application/json por padrão', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200 });
    await apiFetch('/api/test');
    expect(fetch.mock.calls[0][1].headers['Content-Type']).toBe('application/json');
  });

  it('anexa status HTTP ao erro', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 422,
      text: async () => JSON.stringify({ message: 'falhou' }),
    });
    const err = await apiFetch('/api/test').catch(e => e);
    expect(err.status).toBe(422);
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
