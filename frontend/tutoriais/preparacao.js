export const PROFESSOR = {
  nome: 'Ricardo Menezes',
  email: 'ricardo.menezes@resqui.local',
  senha: 'Professor@2026',
};

export const ALUNA = {
  nome: 'Mariana Alves',
  email: 'mariana.alves@resqui.local',
  matricula: '2026000123',
  senha: 'Aluna@2026',
};

export const LABORATORIO_DOS_TUTORIAIS = 'Química Orgânica';

async function cabecalhoDoAdmin(request) {
  const resposta = await request.post('/api/auth/login', { data: { Email: 'admin@resqui.local', Senha: 'Admin@123' } });
  const { token } = await resposta.json();
  return { Authorization: `Bearer ${token}` };
}

async function usuarioPorEmail(request, cabecalho, email) {
  const usuarios = await (await request.get('/api/usuarios', { headers: cabecalho })).json();
  return usuarios.find(usuario => usuario.email === email);
}

async function falharSeRecusado(resposta, acao) {
  if (!resposta.ok()) throw new Error(`Falha ao ${acao}: ${await resposta.text()}`);
}

export async function garantirProfessor(request) {
  const cabecalho = await cabecalhoDoAdmin(request);
  if (await usuarioPorEmail(request, cabecalho, PROFESSOR.email)) return;
  const resposta = await request.post('/api/auth/register', {
    headers: cabecalho,
    data: { Email: PROFESSOR.email, Senha: PROFESSOR.senha, Nome: PROFESSOR.nome, Papel: 'Professor' },
  });
  await falharSeRecusado(resposta, 'criar o professor');
}

export async function removerUsuarioSeExistir(request, email) {
  const cabecalho = await cabecalhoDoAdmin(request);
  const usuario = await usuarioPorEmail(request, cabecalho, email);
  if (!usuario) return;
  const resposta = await request.delete(`/api/usuarios/${usuario.id}/definitivo`, { headers: cabecalho });
  await falharSeRecusado(resposta, `remover ${email}`);
}

export async function registrarSolicitacaoDeDescarte(request, composicao) {
  const cabecalho = await cabecalhoDoAdmin(request);
  const laboratorios = await (await request.get('/api/laboratorios', { headers: cabecalho })).json();
  const laboratorio = laboratorios.find(lab => lab.nome === LABORATORIO_DOS_TUTORIAIS);
  const resposta = await request.post('/api/residuos', {
    headers: cabecalho,
    data: {
      Descricao: composicao, LaboratorioId: laboratorio.id, Tipo: 'Solventes orgânicos não-halogenados',
      Volume: 1, Unidade: 'L', Composicao: composicao, Risco: 'medio', ClassesReatividade: [5],
    },
  });
  await falharSeRecusado(resposta, 'registrar a solicitação de descarte');
}

export async function numeroDoManifestoDoResiduo(request, composicao) {
  const cabecalho = await cabecalhoDoAdmin(request);
  const residuos = await (await request.get('/api/residuos', { headers: cabecalho })).json();
  const residuo = residuos.find(item => item.composicao === composicao);
  const manifestos = await (await request.get('/api/mtrs', { headers: cabecalho })).json();
  return manifestos.find(manifesto => manifesto.id === residuo.mtrId).numero;
}

export async function definirLaboratoriosDoProfessor(request, nomesDosLaboratorios) {
  const cabecalho = await cabecalhoDoAdmin(request);
  const professor = await usuarioPorEmail(request, cabecalho, PROFESSOR.email);
  const laboratorios = await (await request.get('/api/laboratorios', { headers: cabecalho })).json();
  const laboratorioIds = laboratorios.filter(lab => nomesDosLaboratorios.includes(lab.nome)).map(lab => lab.id);
  const resposta = await request.put(`/api/usuarios/${professor.id}/laboratorios`, {
    headers: cabecalho,
    data: { LaboratorioIds: laboratorioIds },
  });
  await falharSeRecusado(resposta, 'definir os laboratórios do professor');
}
