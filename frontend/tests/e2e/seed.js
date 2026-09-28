import { createHmac } from 'node:crypto';

// Helpers de seed via API para deixar os specs E2E independentes do estado do banco.
export const ADMIN = { email: 'admin@resqui.local', senha: 'Admin@123' };

export async function apiAuth(request) {
  const res = await request.post('/api/auth/login', { data: ADMIN });
  const { token } = await res.json();
  return { Authorization: `Bearer ${token}` };
}

export async function ensureLab(request, auth) {
  const labs = await (await request.get('/api/laboratorios', { headers: auth })).json();
  if (labs.length > 0) return labs[0];
  const res = await request.post('/api/laboratorios', {
    headers: auth,
    data: {
      Nome: 'Lab E2E', Responsavel: 'Playwright', Sala: 'S-01',
      Armarios: [], Cor: '#3b82f6',
    },
  });
  return res.json();
}

export async function todosLaboratorios(request, auth) {
  await ensureLab(request, auth);
  const labs = await (await request.get('/api/laboratorios', { headers: auth })).json();
  return labs.map((l) => l.id);
}

export async function atribuirLaboratorios(request, auth, usuarioId, laboratorioIds) {
  return request.put(`/api/usuarios/${usuarioId}/laboratorios`, {
    headers: auth,
    data: { LaboratorioIds: laboratorioIds },
  });
}

export async function ensureReagente(request, auth, { nome, cas, classe = 1 }) {
  const res = await request.get(`/api/reagentes?q=${encodeURIComponent(nome)}&page=1&pageSize=5`, { headers: auth });
  const data = await res.json();
  const items = data.items ?? data;
  const existing = items.find?.((r) => r.nome === nome);
  if (existing) return existing;
  const lab = await ensureLab(request, auth);
  const created = await request.post('/api/reagentes', {
    headers: auth,
    data: {
      Nome: nome, Cas: cas, Formula: '-', ClasseReatividade: classe,
      Estoque: 10, EstoqueMin: 1, Unidade: 'L',
      LaboratorioId: lab.id, Armario: lab.armarios?.[0] ?? '', Controlado: false,
    },
  });
  return created.json();
}

export async function criarResiduoComClasses(request, auth, classes, extra = {}) {
  const lab = await ensureLab(request, auth);
  return request.post('/api/residuos', {
    headers: auth,
    data: {
      Descricao: 'Resíduo E2E classes', LaboratorioId: lab.id,
      Tipo: 'Solventes orgânicos não-halogenados', Volume: 1, Unidade: 'L',
      Composicao: 'mistura E2E', Risco: 'alto', Destino: null,
      ClassesReatividade: classes, ...extra,
    },
  });
}

// Aprova a solicitação de descarte (RF06): solicitado → aguardando-coleta. Requer a policy Aprovador (Admin ou Professor).
export async function aprovarResiduo(request, auth, id) {
  return request.put(`/api/residuos/${id}/aprovar`, { headers: auth });
}

// Config institucional do PGRS (singleton) usada como padrão do Novo manifesto.
// Valor de teste explícito — nunca depender do que o seed demo (DemoDataSeeder) preencheu.
export const PGRS_CONFIG_E2E = {
  GeradorPadrao: 'Gerador E2E Ltda',
  TransportadorPadrao: 'Transportadora E2E Ltda',
  DestinadorPadrao: 'Destinadora E2E Ltda',
  CodigoIbamaPadrao: 'E2E01',
};

// O PUT exige a versão corrente (AtualizadoEmEsperado); com workers em paralelo, outro spec pode
// gravar entre a leitura e a escrita, então uma recusa por conflito é relida e repetida.
export async function seedPgrsConfig(request, auth, overrides = {}, tentativas = 3) {
  for (let i = 0; i < tentativas; i++) {
    const atual = await (await request.get('/api/pgrs-config', { headers: auth })).json();
    const res = await request.put('/api/pgrs-config', {
      headers: auth,
      data: {
        RazaoSocial: '', Cnpj: '', Endereco: '', Unidade: '',
        RespTecnico: '', RespCrq: '', RespEmail: '', RespTel: '',
        ...PGRS_CONFIG_E2E,
        ...overrides,
        AtualizadoEmEsperado: atual.atualizadoEm,
      },
    });
    if (res.status() !== 409) return res;
  }
  throw new Error('seedPgrsConfig: conflito de versão persistente após 3 tentativas');
}

export async function criarResiduoAguardandoColeta(request, auth) {
  const lab = await ensureLab(request, auth);
  const res = await request.post('/api/residuos', {
    headers: auth,
    data: {
      Descricao: 'Resíduo E2E', LaboratorioId: lab.id,
      Tipo: 'Solventes orgânicos não-halogenados', Volume: 2, Unidade: 'L',
      Composicao: 'Acetona 70%', Risco: 'medio', Destino: null, ClassesReatividade: [5],
    },
  });
  const r = await res.json();
  // Resíduo nasce "solicitado" (RF06); aprova para ficar disponível à coleta/MTR.
  return (await aprovarResiduo(request, auth, r.id)).json();
}

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(s) {
  let bits = '';
  for (const c of s.replace(/=+$/, '').toUpperCase()) {
    const i = B32.indexOf(c);
    if (i < 0) continue;
    bits += i.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

// TOTP de 6 dígitos, HMAC-SHA1, janela de 30s (RFC 6238) — o padrão do Identity.
export function totp(secret, at = Date.now()) {
  const contador = Math.floor(at / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(contador));
  const hmac = createHmac('sha1', base32Decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16)
            | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(bin % 1_000_000).padStart(6, '0');
}
