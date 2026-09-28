import { test, expect } from '@playwright/test';
import { apiAuth, todosLaboratorios } from './seed';

async function criarProfessor(request, auth) {
  const email = `prof_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@resqui.local`;
  const senha = 'Prof@123';
  const laboratorioIds = await todosLaboratorios(request, auth);
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: senha, Papel: 'Professor', Nome: 'Professor E2E', LaboratorioIds: laboratorioIds },
  });
  const { token } = await (await request.post('/api/auth/login', { data: { Email: email, Senha: senha } })).json();
  return { email, laboratorioIds, auth: { Authorization: `Bearer ${token}` } };
}

test('convite de Aluno gerado pelo Professor cria conta que já entra no sistema', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const professor = await criarProfessor(request, adminAuth);

  const criado = await request.post('/api/convites', {
    headers: professor.auth,
    data: { Papel: 'Aluno', LaboratorioIds: professor.laboratorioIds },
  });
  expect(criado.ok()).toBeTruthy();
  const { token } = await criado.json();

  const consulta = await request.get(`/api/convites/${token}`);
  expect(consulta.ok()).toBeTruthy();
  expect((await consulta.json()).papel).toBe('Aluno');

  const email = `convidado_${Date.now()}@resqui.local`;
  const aceite = await request.post(`/api/convites/${token}/aceitar`, {
    data: { Nome: 'Convidado E2E', Email: email, Matricula: 'M-E2E', Senha: 'Convid@123' },
  });
  expect(aceite.status()).toBe(204);

  const login = await request.post('/api/auth/login', { data: { Email: email, Senha: 'Convid@123' } });
  expect(login.ok()).toBeTruthy();
  expect((await login.json()).user.papel).toBe('Aluno');

  const segundoUso = await request.post(`/api/convites/${token}/aceitar`, {
    data: { Nome: 'Outro', Email: `outro_${Date.now()}@resqui.local`, Senha: 'Outro@1234' },
  });
  expect(segundoUso.status()).toBe(400);
});

test('senha fraca é recusada pela política do Identity no aceite', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const { token } = await (await request.post('/api/convites', { headers: adminAuth, data: { Papel: 'Aluno' } })).json();

  const aceite = await request.post(`/api/convites/${token}/aceitar`, {
    data: { Nome: 'Fraco', Email: `fraco_${Date.now()}@resqui.local`, Senha: 'senha' },
  });
  expect(aceite.status()).toBe(400);

  const aindaValido = await request.get(`/api/convites/${token}`);
  expect(aindaValido.ok()).toBeTruthy();
});

test('Professor não gera convite de Professor e Aluno não gera convite nenhum', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const professor = await criarProfessor(request, adminAuth);

  const proibido = await request.post('/api/convites', { headers: professor.auth, data: { Papel: 'Professor' } });
  expect(proibido.status()).toBe(400);

  const emailAluno = `aluno_${Date.now()}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: adminAuth,
    data: { Email: emailAluno, Senha: 'Alun@123', Papel: 'Aluno', Nome: 'Aluno E2E', LaboratorioIds: await todosLaboratorios(request, adminAuth) },
  });
  const { token } = await (await request.post('/api/auth/login', { data: { Email: emailAluno, Senha: 'Alun@123' } })).json();

  const semPolicy = await request.post('/api/convites', {
    headers: { Authorization: `Bearer ${token}` },
    data: { Papel: 'Aluno' },
  });
  expect(semPolicy.status()).toBe(403);
});

test('convite revogado deixa de ser aceitável', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const { token, id } = await (await request.post('/api/convites', { headers: adminAuth, data: { Papel: 'Professor' } })).json();

  const revogado = await request.delete(`/api/convites/${id}`, { headers: adminAuth });
  expect(revogado.status()).toBe(204);

  const aceite = await request.post(`/api/convites/${token}/aceitar`, {
    data: { Nome: 'Tarde', Email: `tarde_${Date.now()}@resqui.local`, Senha: 'Tarde@1234' },
  });
  expect(aceite.status()).toBe(400);

  const lista = await (await request.get('/api/convites', { headers: adminAuth })).json();
  expect(lista.find(c => c.id === id).status).toBe('revogado');
});

test('Professor não revoga convite gerado pelo Admin', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const professor = await criarProfessor(request, adminAuth);
  const { id } = await (await request.post('/api/convites', { headers: adminAuth, data: { Papel: 'Professor' } })).json();

  const tentativa = await request.delete(`/api/convites/${id}`, { headers: professor.auth });
  expect(tentativa.status()).toBe(403);

  const doAdmin = await request.delete(`/api/convites/${id}`, { headers: adminAuth });
  expect(doAdmin.status()).toBe(204);
});

test('convidado cria a conta pela tela de aceite e cai no app logado', async ({ page, request }) => {
  const adminAuth = await apiAuth(request);
  const { token } = await (await request.post('/api/convites', { headers: adminAuth, data: { Papel: 'Aluno' } })).json();

  await page.goto(`/?convite=${token}`);
  await expect(page.getByText(/Convite para Aluno/i)).toBeVisible();

  const email = `ui_${Date.now()}@resqui.local`;
  await page.getByLabel('Nome completo').fill('Convidado UI');
  await page.getByLabel('E-mail institucional').fill(email);
  await page.getByLabel('Matrícula').fill('M-UI');
  await page.getByLabel('Senha', { exact: true }).fill('Convid@123');
  await page.getByLabel('Confirmar senha').fill('Convid@123');
  await page.getByRole('button', { name: 'Criar conta e entrar' }).click();

  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();
  expect(page.url()).not.toContain('convite=');
});
