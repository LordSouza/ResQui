// Escopo por laboratório: a autorização é do servidor (400 na entrada, 403 no recurso alheio).
// A tela só esconde o que a API recusaria — isso é coberto pelos testes de componente.
import { test, expect } from '@playwright/test';
import { apiAuth, ensureLab, atribuirLaboratorios } from './seed';

const SENHA = 'Escop@2026x';

async function criarUsuario(request, adminAuth, papel, laboratorioIds) {
  const email = `escopo_${papel.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@resqui.local`;
  const res = await request.post('/api/auth/register', {
    headers: adminAuth,
    data: { Email: email, Senha: SENHA, Papel: papel, Nome: `Escopo ${papel}`, LaboratorioIds: laboratorioIds },
  });
  expect(res.ok(), `falha ao criar ${papel}`).toBeTruthy();
  const criado = await res.json();
  const { token } = await (await request.post('/api/auth/login', { data: { Email: email, Senha: SENHA } })).json();
  return { id: criado.id, email, auth: { Authorization: `Bearer ${token}` } };
}

async function doisLaboratorios(request, adminAuth) {
  const primeiro = await ensureLab(request, adminAuth);
  const segundo = await (await request.post('/api/laboratorios', {
    headers: adminAuth,
    data: {
      Nome: `Lab Escopo ${Date.now()}`, Responsavel: 'Playwright', Sala: 'S-02',
      Armarios: [], Areas: [], Capacidade: 10, AreaM2: 20, Ventilacao: 'natural', Cor: '#ef4444',
    },
  })).json();
  return [primeiro, segundo];
}

async function criarResiduo(request, auth, labId) {
  return request.post('/api/residuos', {
    headers: auth,
    data: {
      Descricao: 'Resíduo escopo E2E', LaboratorioId: labId,
      Tipo: 'Solventes orgânicos não-halogenados', Volume: 1, Unidade: 'L',
      Composicao: 'Acetona 70%', Risco: 'medio', Destino: null, ClassesReatividade: [5],
    },
  });
}

test('professor não cria resíduo em laboratório que não é dele', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const [meu, alheio] = await doisLaboratorios(request, adminAuth);
  const professor = await criarUsuario(request, adminAuth, 'Professor', [meu.id]);

  const recusado = await criarResiduo(request, professor.auth, alheio.id);
  expect(recusado.status()).toBe(400);
  expect((await recusado.json()).message).toContain(alheio.id);

  const aceito = await criarResiduo(request, professor.auth, meu.id);
  expect(aceito.status()).toBe(201);
});

test('professor de outro laboratório não aprova o descarte alheio', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const [meu, alheio] = await doisLaboratorios(request, adminAuth);
  const dono = await criarUsuario(request, adminAuth, 'Professor', [meu.id]);
  const estranho = await criarUsuario(request, adminAuth, 'Professor', [alheio.id]);

  const residuo = await (await criarResiduo(request, dono.auth, meu.id)).json();

  const negado = await request.put(`/api/residuos/${residuo.id}/aprovar`, { headers: estranho.auth });
  expect(negado.status()).toBe(403);

  const permitido = await request.put(`/api/residuos/${residuo.id}/aprovar`, { headers: dono.auth });
  expect(permitido.ok()).toBeTruthy();
});

test('listagem devolve só os resíduos do laboratório do professor', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const [meu, alheio] = await doisLaboratorios(request, adminAuth);
  const dono = await criarUsuario(request, adminAuth, 'Professor', [meu.id]);

  await criarResiduo(request, adminAuth, alheio.id);
  const visivel = await (await criarResiduo(request, dono.auth, meu.id)).json();

  const lista = await (await request.get('/api/residuos', { headers: dono.auth })).json();
  expect(lista.map((r) => r.id)).toContain(visivel.id);
  expect(lista.every((r) => r.laboratorioId === meu.id)).toBeTruthy();
});

test('professor não responde por laboratório alheio ao editá-lo', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const [meu, alheio] = await doisLaboratorios(request, adminAuth);
  const professor = await criarUsuario(request, adminAuth, 'Professor', [meu.id]);

  const negado = await request.put(`/api/laboratorios/${alheio.id}`, {
    headers: professor.auth,
    data: {
      Nome: 'Renomeado indevidamente', Responsavel: 'X', Sala: 'S-02',
      Armarios: [], Areas: [], Capacidade: 10, AreaM2: 20, Ventilacao: 'natural', Cor: '#ef4444',
    },
  });
  expect(negado.status()).toBe(403);
});

test('professor não altera os laboratórios de outro professor', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const [meu, alheio] = await doisLaboratorios(request, adminAuth);
  const professor = await criarUsuario(request, adminAuth, 'Professor', [meu.id]);
  const colega = await criarUsuario(request, adminAuth, 'Professor', [alheio.id]);

  const negado = await atribuirLaboratorios(request, professor.auth, colega.id, [meu.id]);
  expect(negado.status()).toBe(400);
});

test('professor atribui ao aluno só os laboratórios que ele tem, e não remove os alheios', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const [meu, alheio] = await doisLaboratorios(request, adminAuth);
  const professor = await criarUsuario(request, adminAuth, 'Professor', [meu.id]);
  const aluno = await criarUsuario(request, adminAuth, 'Aluno', [alheio.id]);

  const recusado = await atribuirLaboratorios(request, professor.auth, aluno.id, [alheio.id]);
  expect(recusado.status()).toBe(400);

  const aceito = await atribuirLaboratorios(request, professor.auth, aluno.id, [meu.id]);
  expect(aceito.status()).toBe(204);

  const usuarios = await (await request.get('/api/usuarios', { headers: adminAuth })).json();
  const gravado = usuarios.find((u) => u.id === aluno.id);
  expect(gravado.laboratorioIds).toEqual(expect.arrayContaining([meu.id, alheio.id]));
});

test('admin atribui qualquer laboratório a qualquer usuário', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const [meu, alheio] = await doisLaboratorios(request, adminAuth);
  const professor = await criarUsuario(request, adminAuth, 'Professor', [meu.id]);

  const ok = await atribuirLaboratorios(request, adminAuth, professor.id, [meu.id, alheio.id]);
  expect(ok.status()).toBe(204);

  const perfil = await (await request.get('/api/usuarios', { headers: adminAuth })).json();
  expect(perfil.find((u) => u.id === professor.id).laboratorioIds).toEqual([meu.id, alheio.id]);
});
