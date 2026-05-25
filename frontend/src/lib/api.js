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

  return res;
}
