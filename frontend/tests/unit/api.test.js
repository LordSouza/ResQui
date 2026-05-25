import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiFetch } from '../../src/lib/api';

describe('apiFetch', () => {
  let mockFetch;

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(key, value) { this.data[key] = String(value); },
      getItem(key) { return this.data[key] ?? null; },
      removeItem(key) { delete this.data[key]; },
      clear() { this.data = {}; },
    });
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds Authorization header when token exists in localStorage', async () => {
    localStorage.setItem('resqui_token', 'my-jwt');
    mockFetch.mockResolvedValueOnce({ status: 200, ok: true });

    await apiFetch('/api/test');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer my-jwt' }),
      })
    );
  });

  it('omits Authorization header when no token', async () => {
    mockFetch.mockResolvedValueOnce({ status: 200, ok: true });

    await apiFetch('/api/test');

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined();
  });

  it('dispatches auth:unauthorized event on 401 when token exists', async () => {
    localStorage.setItem('resqui_token', 'my-jwt');
    mockFetch.mockResolvedValueOnce({ status: 401, ok: false });

    const listener = vi.fn();
    window.addEventListener('auth:unauthorized', listener);

    await expect(apiFetch('/api/test')).rejects.toThrow('Unauthorized');
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener('auth:unauthorized', listener);
  });

  it('does NOT dispatch auth:unauthorized on 401 when no token', async () => {
    mockFetch.mockResolvedValueOnce({ status: 401, ok: false });

    const listener = vi.fn();
    window.addEventListener('auth:unauthorized', listener);

    await expect(apiFetch('/api/test')).rejects.toThrow('Unauthorized');
    expect(listener).not.toHaveBeenCalled();

    window.removeEventListener('auth:unauthorized', listener);
  });

  it('appends query params to URL when params option is provided', async () => {
    mockFetch.mockResolvedValueOnce({ status: 200, ok: true });

    await apiFetch('/api/reagentes', { params: { q: 'ácido', page: 1 } });

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('/api/reagentes?');
    expect(url).toContain('page=1');
  });

  it('returns the Response object on success', async () => {
    const mockRes = { status: 200, ok: true, json: async () => ({ id: 1 }) };
    mockFetch.mockResolvedValueOnce(mockRes);

    const res = await apiFetch('/api/test');
    expect(res.status).toBe(200);
  });

  it('sets Content-Type: application/json by default', async () => {
    mockFetch.mockResolvedValueOnce({ status: 200, ok: true });

    await apiFetch('/api/test');

    expect(mockFetch.mock.calls[0][1].headers['Content-Type']).toBe('application/json');
  });
});
