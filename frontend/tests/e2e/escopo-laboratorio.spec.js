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
  let cache = null;
  return {
    id: criado.id,
    email,
    async autenticar() {
      if (!cache) {
        const { token } = await (await request.post('/api/auth/login', { data: { Email: email, Senha: SENHA } })).json();
        cache = { Authorization: `Bearer ${token}` };
      }
      return cache;
    },
  };
}

async function doisLaboratorios(request, adminAuth) {
  const primeiro = await ensureLab(request, adminAuth);
  const segundo = await (await request.post('/api/laboratorios', {
    headers: adminAuth,
    data: {
      Nome: `Lab Escopo ${Date.now()}`, Responsavel: 'Playwright', Sala: 'S-02',
      Armarios: [], Cor: '#ef4444',
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

  const recusado = await criarResiduo(request, await professor.autenticar(), alheio.id);
  expect(recusado.status()).toBe(400);
  expect((await recusado.json()).message).toContain(alheio.id);

  const aceito = await criarResiduo(request, await professor.autenticar(), meu.id);
  expect(aceito.status()).toBe(201);
});

test('professor de outro laboratório não aprova o descarte alheio', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const [meu, alheio] = await doisLaboratorios(request, adminAuth);
  const dono = await criarUsuario(request, adminAuth, 'Professor', [meu.id]);
  const estranho = await criarUsuario(request, adminAuth, 'Professor', [alheio.id]);

  const residuo = await (await criarResiduo(request, await dono.autenticar(), meu.id)).json();

  const negado = await request.put(`/api/residuos/${residuo.id}/aprovar`, { headers: await estranho.autenticar() });
  expect(negado.status()).toBe(403);

  const permitido = await request.put(`/api/residuos/${residuo.id}/aprovar`, { headers: await dono.autenticar() });
  expect(permitido.ok()).toBeTruthy();
});

test('listagem devolve só os resíduos do laboratório do professor', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const [meu, alheio] = await doisLaboratorios(request, adminAuth);
  const dono = await criarUsuario(request, adminAuth, 'Professor', [meu.id]);

  await criarResiduo(request, adminAuth, alheio.id);
  const visivel = await (await criarResiduo(request, await dono.autenticar(), meu.id)).json();

  const lista = await (await request.get('/api/residuos', { headers: await dono.autenticar() })).json();
  expect(lista.map((r) => r.id)).toContain(visivel.id);
  expect(lista.every((r) => r.laboratorioId === meu.id)).toBeTruthy();
});

test('professor não responde por laboratório alheio ao editá-lo', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const [meu, alheio] = await doisLaboratorios(request, adminAuth);
  const professor = await criarUsuario(request, adminAuth, 'Professor', [meu.id]);

  const negado = await request.put(`/api/laboratorios/${alheio.id}`, {
    headers: await professor.autenticar(),
    data: {
      Nome: 'Renomeado indevidamente', Sala: 'S-02', Armarios: [],
    },
  });
  expect(negado.status()).toBe(403);
});

test('professor não altera os laboratórios de outro professor', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const [meu, alheio] = await doisLaboratorios(request, adminAuth);
  const professor = await criarUsuario(request, adminAuth, 'Professor', [meu.id]);
  const colega = await criarUsuario(request, adminAuth, 'Professor', [meu.id, alheio.id]);

  const negado = await atribuirLaboratorios(request, await professor.autenticar(), colega.id, [meu.id]);
  expect(negado.status()).toBe(400);
});

test('professor atribui ao aluno só os laboratórios que ele tem, e não remove os alheios', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const [meu, alheio] = await doisLaboratorios(request, adminAuth);
  const professor = await criarUsuario(request, adminAuth, 'Professor', [meu.id]);
  const aluno = await criarUsuario(request, adminAuth, 'Aluno', [meu.id, alheio.id]);

  const recusado = await atribuirLaboratorios(request, await professor.autenticar(), aluno.id, [alheio.id]);
  expect(recusado.status()).toBe(400);

  const aceito = await atribuirLaboratorios(request, await professor.autenticar(), aluno.id, [meu.id]);
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
  const gravado = perfil.find((u) => u.id === professor.id).laboratorioIds;
  expect(gravado).toEqual(expect.arrayContaining([meu.id, alheio.id]));
  expect(gravado).toHaveLength(2);
});

test('professor só enxerga e só age sobre usuários que compartilham laboratório com ele', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const [meu, alheio] = await doisLaboratorios(request, adminAuth);
  const professor = await criarUsuario(request, adminAuth, 'Professor', [meu.id]);
  const alunoMeu = await criarUsuario(request, adminAuth, 'Aluno', [meu.id]);
  const alunoAlheio = await criarUsuario(request, adminAuth, 'Aluno', [alheio.id]);
  const auth = await professor.autenticar();

  const ids = (await (await request.get('/api/usuarios', { headers: auth })).json()).map((u) => u.id);
  expect(ids).toContain(professor.id);
  expect(ids).toContain(alunoMeu.id);
  expect(ids).not.toContain(alunoAlheio.id);
  expect(ids).not.toContain((await (await request.get('/api/auth/me', { headers: adminAuth })).json()).id);

  expect((await atribuirLaboratorios(request, auth, alunoAlheio.id, [meu.id])).status()).toBe(403);
  expect((await request.delete(`/api/usuarios/${alunoAlheio.id}`, { headers: auth })).status()).toBe(403);
});

test('professor não cria conta nem convite sem laboratório, e só lista os convites que gerou', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const [meu] = await doisLaboratorios(request, adminAuth);
  const professor = await criarUsuario(request, adminAuth, 'Professor', [meu.id]);
  const auth = await professor.autenticar();

  const semLab = await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: `semlab_${Date.now()}@resqui.local`, Senha: SENHA, Papel: 'Aluno', Nome: 'Sem Lab' },
  });
  expect(semLab.status()).toBe(400);
  expect((await request.post('/api/convites', { headers: auth, data: { Papel: 'Aluno' } })).status()).toBe(400);

  const meuConvite = await (await request.post('/api/convites', {
    headers: auth, data: { Papel: 'Aluno', LaboratorioIds: [meu.id] },
  })).json();
  const doAdmin = await (await request.post('/api/convites', { headers: adminAuth, data: { Papel: 'Aluno' } })).json();

  const ids = (await (await request.get('/api/convites', { headers: auth })).json()).map((c) => c.id);
  expect(ids).toEqual([meuConvite.id]);
  expect((await request.delete(`/api/convites/${doAdmin.id}`, { headers: auth })).status()).toBe(403);
});
