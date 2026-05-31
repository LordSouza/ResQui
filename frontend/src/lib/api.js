// frontend/src/lib/api.js
const TOKEN_KEY = 'resqui_token';

export async function apiFetch(path, { params, headers: extraHeaders, ...options } = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const url = params ? `${path}?${new URLSearchParams(params)}` : path;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
  });

  if (res.status === 401) {
    if (token) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    let message;
    try {
      const text = await res.text();
      if (text) {
        try {
          const body = JSON.parse(text);
          message = body.message
            || body.title
            || (Array.isArray(body.errors) && body.errors.length ? body.errors.join('; ') : undefined)
            || body.detail;
        } catch {
          message = text;
        }
      }
    } catch { /* noop */ }
    const err = new Error(message || `Erro desconhecido (HTTP ${res.status})`);
    err.status = res.status;
    throw err;
  }

  return res;
}
