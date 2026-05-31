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
      const body = await res.json();
      if (body.message) message = body.message;
      else if (body.title) message = body.title;
      else if (Array.isArray(body.errors) && body.errors.length) message = body.errors.join('; ');
      else if (body.detail) message = body.detail;
    } catch {
      try { message = await res.text(); } catch { /* noop */ }
    }
    const err = new Error(message || `Erro desconhecido (HTTP ${res.status})`);
    err.status = res.status;
    throw err;
  }

  return res;
}
