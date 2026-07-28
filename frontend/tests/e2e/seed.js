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
      Armarios: [], Areas: [], Capacidade: 10, AreaM2: 20, Ventilacao: 'natural',
      Cor: '#3b82f6',
    },
  });
  return res.json();
}

export async function ensureReagente(request, auth, { nome, cas, classe = 1 }) {
  const res = await request.get(`/api/reagentes?q=${encodeURIComponent(nome)}&page=1&pageSize=5`, { headers: auth });
  const data = await res.json();
  const items = data.items ?? data;
  const existing = items.find?.((r) => r.nome === nome);
  if (existing) return existing;
  const created = await request.post('/api/reagentes', {
    headers: auth,
    data: {
      Nome: nome, Cas: cas, Formula: '-', ClasseReatividade: classe,
      Estoque: 10, EstoqueMin: 1, Unidade: 'L',
      Local: 'Armário A1', Responsavel: 'Playwright', Controlado: false,
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

// Aprova a solicitação de descarte (RF06): solicitado → aguardando-coleta. Requer Gestor+ (auth admin).
export async function aprovarResiduo(request, auth, id) {
  return request.put(`/api/residuos/${id}/aprovar`, { headers: auth });
}

// Config institucional do PGRS (singleton) usada como padrão do Novo Pré-MTR.
// Valor de teste explícito — nunca depender do que o seed demo (DemoDataSeeder) preencheu.
export const PGRS_CONFIG_E2E = {
  GeradorPadrao: 'Gerador E2E Ltda',
  TransportadorPadrao: 'Transportadora E2E Ltda',
  DestinadorPadrao: 'Destinadora E2E Ltda',
  CodigoIbamaPadrao: 'E2E01',
};

export async function seedPgrsConfig(request, auth, overrides = {}) {
  return request.put('/api/pgrs-config', {
    headers: auth,
    data: {
      RazaoSocial: '', Cnpj: '', Endereco: '', Unidade: '',
      RespTecnico: '', RespCrq: '', RespEmail: '', RespTel: '',
      ...PGRS_CONFIG_E2E,
      ...overrides,
    },
  });
}

export async function criarResiduoAguardandoColeta(request, auth) {
  const lab = await ensureLab(request, auth);
  const res = await request.post('/api/residuos', {
    headers: auth,
    data: {
      Descricao: 'Resíduo E2E', LaboratorioId: lab.id,
      Tipo: 'Solventes orgânicos não-halogenados', Volume: 2, Unidade: 'L',
      Composicao: 'Acetona 70%', Risco: 'medio', Destino: null,
    },
  });
  const r = await res.json();
  // Resíduo nasce "solicitado" (RF06); aprova para ficar disponível à coleta/MTR.
  return (await aprovarResiduo(request, auth, r.id)).json();
}
