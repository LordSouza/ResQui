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

test('catálogo de laboratórios traz só os do professor, e o alheio é 403', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const [meu, alheio] = await doisLaboratorios(request, adminAuth);
  const professor = await criarUsuario(request, adminAuth, 'Professor', [meu.id]);
  const headers = await professor.autenticar();

  const ids = (await (await request.get('/api/laboratorios', { headers })).json()).map(l => l.id);
  expect(ids).toEqual([meu.id]);

  expect((await request.get(`/api/laboratorios/${meu.id}`, { headers })).ok()).toBeTruthy();
  expect((await request.get(`/api/laboratorios/${alheio.id}`, { headers })).status()).toBe(403);
  expect((await request.get('/api/laboratorios/Lab-999999', { headers })).status()).toBe(404);

  const idsDoAdmin = (await (await request.get('/api/laboratorios', { headers: adminAuth })).json()).map(l => l.id);
  expect(idsDoAdmin).toEqual(expect.arrayContaining([meu.id, alheio.id]));
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

test('auditoria do professor traz só ações de quem compartilha laboratório com ele', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const [meu, alheio] = await doisLaboratorios(request, adminAuth);
  const professor = await criarUsuario(request, adminAuth, 'Professor', [meu.id]);
  const alunoMeu = await criarUsuario(request, adminAuth, 'Aluno', [meu.id]);
  const alunoAlheio = await criarUsuario(request, adminAuth, 'Aluno', [alheio.id]);

  expect((await criarResiduo(request, await alunoMeu.autenticar(), meu.id)).status()).toBe(201);
  expect((await criarResiduo(request, await alunoAlheio.autenticar(), alheio.id)).status()).toBe(201);

  const autores = async (auth) => (await (await request.get('/api/auditoria', { headers: auth })).json())
    .map((e) => e.who.toLowerCase());
  const doProfessor = await autores(await professor.autenticar());
  const doAdmin = await autores(adminAuth);

  expect(doProfessor).toContain(alunoMeu.email.toLowerCase());
  expect(doProfessor).not.toContain(alunoAlheio.email.toLowerCase());
  expect(doProfessor).not.toContain('admin@resqui.local');
  expect(doAdmin).toContain(alunoAlheio.email.toLowerCase());
});

test('reagente de laboratório alheio não aparece, não abre e não recebe baixa nem transferência', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const [meu, alheio] = await doisLaboratorios(request, adminAuth);
  const professor = await criarUsuario(request, adminAuth, 'Professor', [meu.id]);
  const headers = await professor.autenticar();
  const nome = `Reagente alheio ${Date.now()}`;
  const reagenteBase = { Cas: '64-17-5', Formula: 'C2H6O', ClasseReatividade: 5, Estoque: 5, Unidade: 'L', Controlado: false };

  const doAlheio = await (await request.post('/api/reagentes', {
    headers: adminAuth,
    data: { ...reagenteBase, Nome: nome, LaboratorioId: alheio.id, Armario: '' },
  })).json();

  const lista = await (await request.get(`/api/reagentes?q=${encodeURIComponent(nome)}`, { headers })).json();
  expect(lista.items.map(r => r.id)).not.toContain(doAlheio.id);
  expect((await request.get(`/api/reagentes/${doAlheio.id}`, { headers })).status()).toBe(403);
  expect((await request.post(`/api/reagentes/${doAlheio.id}/baixa`, { headers, data: { Quantidade: 1 } })).status()).toBe(403);

  const criarNoAlheio = await request.post('/api/reagentes', {
    headers,
    data: { ...reagenteBase, Nome: `${nome} (recusado)`, LaboratorioId: alheio.id, Armario: '' },
  });
  expect(criarNoAlheio.status()).toBe(400);

  const meuArmario = meu.armarios?.[0] ?? '';
  const proprio = await request.post('/api/reagentes', {
    headers,
    data: { ...reagenteBase, Nome: `${nome} (meu)`, LaboratorioId: meu.id, Armario: meuArmario },
  });
  expect(proprio.status()).toBe(201);
  const criado = await proprio.json();
  expect(criado.local).toBe(meuArmario ? `${meu.nome} · ${meuArmario}` : meu.nome);

  const transferirParaAlheio = await request.post(`/api/reagentes/${criado.id}/transferencia`, {
    headers,
    data: { LaboratorioId: alheio.id, Armario: '' },
  });
  expect(transferirParaAlheio.status()).toBe(400);
});

async function residuoAprovado(request, adminAuth, labId) {
  const residuo = await (await criarResiduo(request, adminAuth, labId)).json();
  await request.put(`/api/residuos/${residuo.id}/aprovar`, { headers: adminAuth });
  return residuo;
}

async function emitirManifesto(request, auth, residuoIds) {
  return request.post('/api/mtrs', {
    headers: auth,
    data: { Gerador: 'Gerador E2E', Transportadora: 'Transportadora E2E', ResiduoIds: residuoIds },
  });
}

test('manifesto misto mascara as linhas alheias, e só quem responde por todos confirma a destinação', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const [meu, alheio] = await doisLaboratorios(request, adminAuth);
  const professor = await criarUsuario(request, adminAuth, 'Professor', [meu.id]);
  const headers = await professor.autenticar();

  const doMeu = await residuoAprovado(request, adminAuth, meu.id);
  const doAlheio = await residuoAprovado(request, adminAuth, alheio.id);
  const misto = await (await emitirManifesto(request, adminAuth, [doMeu.id, doAlheio.id])).json();

  const visto = await (await request.get(`/api/mtrs/${misto.id}`, { headers })).json();
  expect(visto.residuoIds).toEqual([doMeu.id]);
  expect(visto.residuosDeOutrosLaboratorios).toHaveLength(1);
  expect(visto.totalLitros).toBe(2);
  expect((await request.get(`/api/mtrs/${misto.id}/pdf`, { headers })).ok()).toBeTruthy();

  const hoje = new Date().toISOString().slice(0, 10);
  const confirmar = await request.post(`/api/mtrs/${misto.id}/destinacao`, { headers, data: { Data: hoje } });
  expect(confirmar.status()).toBe(403);

  const soAlheio = await (await emitirManifesto(request, adminAuth, [(await residuoAprovado(request, adminAuth, alheio.id)).id])).json();
  expect((await request.get(`/api/mtrs/${soAlheio.id}`, { headers })).status()).toBe(403);
  const lista = await (await request.get('/api/mtrs', { headers })).json();
  expect(lista.map(m => m.id)).toContain(misto.id);
  expect(lista.map(m => m.id)).not.toContain(soAlheio.id);

  const recusado = await emitirManifesto(request, headers, [(await residuoAprovado(request, adminAuth, alheio.id)).id]);
  expect(recusado.status()).toBe(403);
});

test('relatório sai recortado pelo escopo de quem gera, e só o autor e o Admin o baixam', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const [meu, alheio] = await doisLaboratorios(request, adminAuth);
  const professor = await criarUsuario(request, adminAuth, 'Professor', [meu.id]);
  const colega = await criarUsuario(request, adminAuth, 'Professor', [meu.id]);
  const headers = await professor.autenticar();
  const sufixo = Date.now();
  const reagenteBase = { Cas: '64-17-5', Formula: 'C2H6O', ClasseReatividade: 5, Estoque: 5, Unidade: 'L', Controlado: false };
  await request.post('/api/reagentes', { headers: adminAuth, data: { ...reagenteBase, Nome: `Do meu ${sufixo}`, LaboratorioId: meu.id, Armario: meu.armarios?.[0] ?? '' } });
  await request.post('/api/reagentes', { headers: adminAuth, data: { ...reagenteBase, Nome: `Do alheio ${sufixo}`, LaboratorioId: alheio.id, Armario: '' } });

  const relatorio = await (await request.post('/api/relatorios/gerar', { headers, data: { Tipo: 'inventario' } })).json();
  const csv = await (await request.get(`/api/relatorios/${relatorio.id}/download`, { headers })).text();
  expect(csv).toContain(`Do meu ${sufixo}`);
  expect(csv).not.toContain(`Do alheio ${sufixo}`);

  const csvDoAdmin = await (await request.get(`/api/relatorios/${relatorio.id}/download`, { headers: adminAuth })).text();
  expect(csvDoAdmin).not.toContain(`Do alheio ${sufixo}`);

  const headersDoColega = await colega.autenticar();
  expect((await request.get(`/api/relatorios/${relatorio.id}/download`, { headers: headersDoColega })).status()).toBe(403);
  const historicoDoColega = await (await request.get('/api/relatorios', { headers: headersDoColega })).json();
  expect(historicoDoColega.map(r => r.id)).not.toContain(relatorio.id);
});

test('relatório de um laboratório escolhido traz só ele, e laboratório fora do escopo é recusado', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const [primeiro, segundo] = await doisLaboratorios(request, adminAuth);
  const terceiro = await (await request.post('/api/laboratorios', {
    headers: adminAuth,
    data: { Nome: `Lab Fora ${Date.now()}`, Responsavel: 'Playwright', Sala: 'S-03', Armarios: [], Cor: '#22c55e' },
  })).json();
  const professor = await criarUsuario(request, adminAuth, 'Professor', [primeiro.id, segundo.id]);
  const headers = await professor.autenticar();
  const sufixo = Date.now();
  const reagenteBase = { Cas: '64-17-5', Formula: 'C2H6O', ClasseReatividade: 5, Estoque: 5, Unidade: 'L', Controlado: false };
  await request.post('/api/reagentes', { headers: adminAuth, data: { ...reagenteBase, Nome: `Do primeiro ${sufixo}`, LaboratorioId: primeiro.id, Armario: primeiro.armarios?.[0] ?? '' } });
  await request.post('/api/reagentes', { headers: adminAuth, data: { ...reagenteBase, Nome: `Do segundo ${sufixo}`, LaboratorioId: segundo.id, Armario: '' } });

  const relatorio = await (await request.post('/api/relatorios/gerar', {
    headers, data: { Tipo: 'inventario', LaboratorioIds: [segundo.id] },
  })).json();
  expect(relatorio.laboratorioIds).toEqual([segundo.id]);
  const csv = await (await request.get(`/api/relatorios/${relatorio.id}/download`, { headers })).text();
  expect(csv).toContain(`Do segundo ${sufixo}`);
  expect(csv).not.toContain(`Do primeiro ${sufixo}`);

  const recusado = await request.post('/api/relatorios/gerar', {
    headers, data: { Tipo: 'inventario', LaboratorioIds: [terceiro.id] },
  });
  expect(recusado.status()).toBe(400);
});
