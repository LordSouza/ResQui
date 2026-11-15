// frontend/src/lib/api.js
const TOKEN_KEY = 'resqui_token';
const TIMEOUT_MS = 30_000;

function mensagemPorStatus(status, metodo) {
  // No 504 o proxy desistiu de esperar, mas o backend pode ter concluído a gravação.
  if (status === 504 && metodo !== 'GET') {
    return 'O servidor demorou demais para responder. Confira se a operação foi registrada antes de repeti-la.';
  }
  if (status === 413) return 'O envio é grande demais para o servidor. Reduza o tamanho dos dados e tente novamente.';
  if (status === 502 || status === 503 || status === 504) {
    return 'O servidor está indisponível ou demorou demais para responder. Tente novamente em instantes.';
  }
  return `Erro desconhecido (HTTP ${status})`;
}

// AbortSignal.any/timeout não existem no alvo padrão do Vite (Safari 14, Chrome 87): combina à mão.
async function fetchComTimeout(url, { signal: signalDoChamador, ...options }) {
  const controller = new AbortController();
  let estourouTempo = false;
  const timer = setTimeout(() => { estourouTempo = true; controller.abort(); }, TIMEOUT_MS);
  const repassarAbort = () => controller.abort(signalDoChamador.reason);
  if (signalDoChamador?.aborted) repassarAbort();
  else signalDoChamador?.addEventListener('abort', repassarAbort);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    if (estourouTempo) {
      const metodo = (options.method ?? 'GET').toUpperCase();
      throw new Error(metodo === 'GET'
        ? 'O servidor não respondeu a tempo. Tente novamente.'
        : 'O servidor não respondeu a tempo. Confira se a operação foi registrada antes de repeti-la.');
    }
    if (e instanceof TypeError) {
      throw new Error('Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
    signalDoChamador?.removeEventListener('abort', repassarAbort);
  }
}

export async function apiFetch(path, { params, headers: extraHeaders, ...options } = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const url = params ? `${path}?${new URLSearchParams(params)}` : path;

  const res = await fetchComTimeout(url, {
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
        } catch { /* corpo não-JSON (ex.: página HTML do nginx) não serve para o usuário */ }
      }
    } catch { /* noop */ }
    const err = new Error(message || mensagemPorStatus(res.status, (options.method ?? 'GET').toUpperCase()));
    err.status = res.status;
    throw err;
  }

  return res;
}
