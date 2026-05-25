// Dados mock para o ResQui
// Classes de reatividade (baseado em EPA/NOAA simplificado)
export let REATIVIDADE_CLASSES = {
  1: 'Ácidos inorgânicos',
  2: 'Ácidos orgânicos',
  3: 'Bases / álcalis',
  4: 'Oxidantes fortes',
  5: 'Solventes orgânicos',
  6: 'Solventes halogenados',
  7: 'Metais pesados (sais)',
  8: 'Cianetos',
  9: 'Sulfetos',
  10: 'Agentes redutores',
  11: 'Peróxidos',
  12: 'Reativos com água',
};

// Matriz de compatibilidade: 0 = compatível, 1 = cautela, 2 = perigo, 3 = proibido
// row = classe A, col = classe B
export let COMPAT_MATRIX = {
  //   1  2  3  4  5  6  7  8  9 10 11 12
  1: [0, 1, 3, 2, 1, 1, 1, 3, 3, 2, 3, 3],
  2: [1, 0, 3, 2, 0, 0, 1, 3, 2, 1, 2, 1],
  3: [3, 3, 0, 2, 1, 2, 2, 2, 1, 1, 2, 3],
  4: [2, 2, 2, 0, 3, 2, 1, 3, 3, 3, 2, 2],
  5: [1, 0, 1, 3, 0, 0, 0, 1, 0, 0, 2, 1],
  6: [1, 0, 2, 2, 0, 0, 0, 1, 0, 2, 2, 1],
  7: [1, 1, 2, 1, 0, 0, 0, 3, 2, 1, 1, 1],
  8: [3, 3, 2, 3, 1, 1, 3, 0, 1, 2, 3, 2],
  9: [3, 2, 1, 3, 0, 0, 2, 1, 0, 1, 2, 2],
 10: [2, 1, 1, 3, 0, 2, 1, 2, 1, 0, 3, 1],
 11: [3, 2, 2, 2, 2, 2, 1, 3, 2, 3, 0, 3],
 12: [3, 1, 3, 2, 1, 1, 1, 2, 2, 1, 3, 0],
};

export let PICTOS_GHS = {
  flame: { code: 'GHS02', label: 'Inflamável' },
  flame_circle: { code: 'GHS03', label: 'Oxidante' },
  bottle: { code: 'GHS04', label: 'Gás sob pressão' },
  corrosion: { code: 'GHS05', label: 'Corrosivo' },
  skull: { code: 'GHS06', label: 'Tóxico agudo' },
  exclam: { code: 'GHS07', label: 'Nocivo / irritante' },
  health: { code: 'GHS08', label: 'Perigo à saúde' },
  envir: { code: 'GHS09', label: 'Perigoso ao ambiente' },
  explosion: { code: 'GHS01', label: 'Explosivo' },
};

export let REAGENTES = [
  {
    id: 'R-00128', cas: '7647-01-0', nome: 'Ácido Clorídrico',
    sinonimo: 'HCl 37%', formula: 'HCl', classe: 1,
    estoque: 2.4, unidade: 'L', validade: '2027-04-12', validade_status: 'ok',
    local: 'Lab-201 · Armário A · Pra. 3', responsavel: 'Profa. Ana Lima',
    pictos: ['corrosion', 'exclam'], signal: 'Perigo',
    h: ['H290 Pode ser corrosivo aos metais', 'H314 Causa queimadura severa à pele e dano aos olhos', 'H335 Pode causar irritação respiratória'],
    p: ['P234 Manter no recipiente original', 'P260 Não inalar vapores', 'P280 Usar EPI', 'P303+P361+P353 Em caso de contato: remover roupas, lavar com água'],
    abertura: '2025-03-04', controlado: true, lote: 'L-9817-A',
  },
  {
    id: 'R-00129', cas: '7664-93-9', nome: 'Ácido Sulfúrico',
    sinonimo: 'H₂SO₄ concentrado', formula: 'H2SO4', classe: 1,
    estoque: 0.4, unidade: 'L', validade: '2026-08-30', validade_status: 'ok',
    local: 'Lab-201 · Armário A · Pra. 1', responsavel: 'Profa. Ana Lima',
    pictos: ['corrosion'], signal: 'Perigo',
    h: ['H314 Causa queimadura severa à pele e dano aos olhos', 'H290 Pode ser corrosivo aos metais'],
    p: ['P280 Usar luvas e óculos de proteção', 'P301+P330+P331 NÃO provocar vômito', 'P305+P351+P338 Em caso de contato com olhos: lavar 15 min'],
    abertura: '2024-11-12', controlado: true, lote: 'L-2241-C', estoque_min: 1.0,
  },
  {
    id: 'R-00130', cas: '1310-73-2', nome: 'Hidróxido de Sódio',
    sinonimo: 'NaOH lentilhas', formula: 'NaOH', classe: 3,
    estoque: 1.8, unidade: 'kg', validade: '2028-01-20', validade_status: 'ok',
    local: 'Lab-201 · Armário B · Pra. 2', responsavel: 'Téc. Carlos Mendes',
    pictos: ['corrosion'], signal: 'Perigo',
    h: ['H290 Pode ser corrosivo aos metais', 'H314 Causa queimadura severa'],
    p: ['P280 Usar EPI', 'P305+P351+P338 Em caso de contato com olhos: lavar'],
    abertura: '2025-01-10', controlado: false, lote: 'L-4421-B',
  },
  {
    id: 'R-00131', cas: '67-56-1', nome: 'Metanol',
    sinonimo: 'Álcool metílico P.A.', formula: 'CH3OH', classe: 5,
    estoque: 3.8, unidade: 'L', validade: '2026-06-15', validade_status: 'ok',
    local: 'Lab-203 · Armário Inflamáveis · Pra. 1', responsavel: 'Prof. Renan Costa',
    pictos: ['flame', 'skull', 'health'], signal: 'Perigo',
    h: ['H225 Líquido e vapores altamente inflamáveis', 'H301+H311+H331 Tóxico se ingerido, em contato com a pele ou inalado', 'H370 Provoca danos aos órgãos'],
    p: ['P210 Manter afastado do calor', 'P233 Manter recipiente bem fechado', 'P280 Usar EPI', 'P302+P352 Em caso de contato com pele: lavar com sabão'],
    abertura: '2025-06-22', controlado: true, lote: 'L-7755-A',
  },
  {
    id: 'R-00132', cas: '64-17-5', nome: 'Etanol Absoluto',
    sinonimo: 'Álcool etílico 99,5%', formula: 'C2H5OH', classe: 5,
    estoque: 12.5, unidade: 'L', validade: '2027-12-01', validade_status: 'ok',
    local: 'Lab-203 · Armário Inflamáveis · Pra. 2', responsavel: 'Prof. Renan Costa',
    pictos: ['flame'], signal: 'Perigo',
    h: ['H225 Líquido e vapores altamente inflamáveis', 'H319 Provoca irritação ocular grave'],
    p: ['P210 Manter afastado de chamas', 'P233 Recipiente fechado', 'P305+P351+P338'],
    abertura: '2025-08-01', controlado: false, lote: 'L-1188-D',
  },
  {
    id: 'R-00133', cas: '67-64-1', nome: 'Acetona',
    sinonimo: 'Propanona P.A.', formula: 'C3H6O', classe: 5,
    estoque: 0.6, unidade: 'L', validade: '2026-03-05', validade_status: 'expira-breve',
    local: 'Lab-203 · Armário Inflamáveis · Pra. 3', responsavel: 'Prof. Renan Costa',
    pictos: ['flame', 'exclam'], signal: 'Perigo',
    h: ['H225 Líquido e vapores altamente inflamáveis', 'H319 Provoca irritação ocular', 'H336 Pode provocar sonolência'],
    p: ['P210 Afastar de calor', 'P233 Recipiente fechado', 'P305+P351+P338'],
    abertura: '2024-12-09', controlado: false, lote: 'L-3320-A', estoque_min: 1.0,
  },
  {
    id: 'R-00134', cas: '67-66-3', nome: 'Clorofórmio',
    sinonimo: 'Triclorometano', formula: 'CHCl3', classe: 6,
    estoque: 0.2, unidade: 'L', validade: '2026-01-18', validade_status: 'expira-breve',
    local: 'Lab-205 · Armário C · Pra. 1', responsavel: 'Profa. Júlia Reis',
    pictos: ['skull', 'health', 'exclam'], signal: 'Perigo',
    h: ['H302 Nocivo se ingerido', 'H315 Irritação cutânea', 'H351 Suspeito de causar câncer', 'H373 Pode causar danos a órgãos por exposição repetida'],
    p: ['P201 Obter instruções específicas', 'P260 Não inalar', 'P280 Usar EPI'],
    abertura: '2024-08-15', controlado: true, lote: 'L-5566-A', estoque_min: 0.5,
  },
  {
    id: 'R-00135', cas: '7722-84-1', nome: 'Peróxido de Hidrogênio 30%',
    sinonimo: 'H₂O₂ 30 vol.', formula: 'H2O2', classe: 11,
    estoque: 1.2, unidade: 'L', validade: '2026-02-28', validade_status: 'expira-breve',
    local: 'Lab-205 · Armário Oxidantes · Pra. 1', responsavel: 'Profa. Júlia Reis',
    pictos: ['flame_circle', 'corrosion', 'exclam'], signal: 'Perigo',
    h: ['H271 Pode provocar incêndio ou explosão (oxidante forte)', 'H302 Nocivo se ingerido', 'H318 Provoca lesões oculares graves'],
    p: ['P210 Afastar de calor', 'P220 Manter afastado de roupas e combustíveis', 'P280 Usar EPI'],
    abertura: '2025-04-10', controlado: false, lote: 'L-9091-B',
  },
  {
    id: 'R-00136', cas: '7440-43-9', nome: 'Sulfato de Cobre II',
    sinonimo: 'CuSO₄·5H₂O', formula: 'CuSO4', classe: 7,
    estoque: 0.85, unidade: 'kg', validade: '2030-05-01', validade_status: 'ok',
    local: 'Lab-201 · Armário D · Pra. 4', responsavel: 'Téc. Carlos Mendes',
    pictos: ['exclam', 'envir'], signal: 'Atenção',
    h: ['H302 Nocivo se ingerido', 'H315 Irritação cutânea', 'H319 Irritação ocular', 'H410 Muito tóxico para organismos aquáticos'],
    p: ['P273 Evitar liberação ao ambiente', 'P280 Usar EPI', 'P501 Descarte em coletor adequado'],
    abertura: '2025-02-04', controlado: false, lote: 'L-8123-C',
  },
  {
    id: 'R-00137', cas: '7681-49-4', nome: 'Fluoreto de Sódio',
    sinonimo: 'NaF', formula: 'NaF', classe: 7,
    estoque: 0.15, unidade: 'kg', validade: '2025-12-30', validade_status: 'expira-breve',
    local: 'Lab-201 · Armário D · Pra. 2', responsavel: 'Téc. Carlos Mendes',
    pictos: ['skull'], signal: 'Perigo',
    h: ['H301 Tóxico se ingerido', 'H315 Irritação cutânea', 'H319 Irritação ocular'],
    p: ['P264 Lavar mãos após manuseio', 'P280 Usar EPI', 'P301+P310 Em caso de ingestão: contatar centro antiveneno'],
    abertura: '2024-05-19', controlado: true, lote: 'L-6677-A', estoque_min: 0.3,
  },
  {
    id: 'R-00138', cas: '7681-52-9', nome: 'Hipoclorito de Sódio 12%',
    sinonimo: 'Água sanitária concentrada', formula: 'NaClO', classe: 4,
    estoque: 5.0, unidade: 'L', validade: '2026-04-20', validade_status: 'ok',
    local: 'Lab-209 · Armário Oxidantes · Pra. 2', responsavel: 'Téc. Carlos Mendes',
    pictos: ['corrosion', 'envir'], signal: 'Perigo',
    h: ['H290 Corrosivo aos metais', 'H314 Queimadura severa', 'H400 Tóxico ambiental'],
    p: ['P234 No recipiente original', 'P273 Evitar liberação', 'P280 EPI'],
    abertura: '2025-07-15', controlado: false, lote: 'L-4413-B',
  },
  {
    id: 'R-00139', cas: '110-54-3', nome: 'n-Hexano',
    sinonimo: 'Hexano P.A.', formula: 'C6H14', classe: 5,
    estoque: 2.0, unidade: 'L', validade: '2026-09-10', validade_status: 'ok',
    local: 'Lab-203 · Armário Inflamáveis · Pra. 4', responsavel: 'Prof. Renan Costa',
    pictos: ['flame', 'skull', 'health', 'envir'], signal: 'Perigo',
    h: ['H225 Inflamável', 'H304 Pode ser fatal se ingerido', 'H361 Suspeito de afetar a fertilidade', 'H373 Danos a órgãos'],
    p: ['P210 Afastar de calor', 'P273 Evitar liberação', 'P280 EPI'],
    abertura: '2025-05-20', controlado: true, lote: 'L-2299-A',
  },
];

export let LABORATORIOS = [
  { id: 'Lab-201', nome: 'Química Inorgânica', responsavel: 'Profa. Ana Lima', sala: 'Bloco IMC · 2º andar · Sala 201', criado: '2023-02-14', armarios: ['Armário A', 'Armário B', 'Armário D'], capacidade: 80, area_m2: 64, ventilacao: 'capela + exaustão', cor: '#1465c0' },
  { id: 'Lab-203', nome: 'Química Orgânica', responsavel: 'Prof. Renan Costa', sala: 'Bloco IMC · 2º andar · Sala 203', criado: '2023-02-14', armarios: ['Armário Inflamáveis'], capacidade: 60, area_m2: 58, ventilacao: 'capela + exaustão · armário anti-chama', cor: '#b76e00' },
  { id: 'Lab-205', nome: 'Análise Instrumental', responsavel: 'Profa. Júlia Reis', sala: 'Bloco IMC · 2º andar · Sala 205', criado: '2023-05-08', armarios: ['Armário C', 'Armário Oxidantes'], capacidade: 40, area_m2: 52, ventilacao: 'capela individual por bancada', cor: '#5b3c8c' },
  { id: 'Lab-209', nome: 'Laboratório de Apoio', responsavel: 'Téc. Carlos Mendes', sala: 'Bloco IMC · Térreo · Sala 209', criado: '2024-01-20', armarios: ['Armário Oxidantes'], capacidade: 30, area_m2: 42, ventilacao: 'ventilação natural + exaustor', cor: '#1f7a3e' },
  { id: 'Lab-211', nome: 'Físico-Química', responsavel: 'Prof. Renan Costa', sala: 'Bloco IMC · 2º andar · Sala 211', criado: '2024-08-03', armarios: ['Armário Principal'], capacidade: 24, area_m2: 38, ventilacao: 'capela compartilhada', cor: '#0d4a8c' },
];

export let RESIDUOS = [
  { id: 'W-0451', tipo: 'Solventes halogenados', volume: 4.2, unidade: 'L', gerador: 'Lab-205', registrado: '2025-11-18', status: 'aguardando-coleta', composicao: 'Clorofórmio + Diclorometano', risco: 'alto', mtr: null },
  { id: 'W-0452', tipo: 'Ácidos inorgânicos', volume: 2.0, unidade: 'L', gerador: 'Lab-201', registrado: '2025-11-19', status: 'aguardando-coleta', composicao: 'HCl + H₂SO₄ neutralizado a pH 4', risco: 'medio', mtr: null },
  { id: 'W-0453', tipo: 'Solventes orgânicos não-halogenados', volume: 12.5, unidade: 'L', gerador: 'Lab-203', registrado: '2025-11-19', status: 'em-coleta', composicao: 'Acetona, Etanol, Metanol', risco: 'medio', mtr: 'MTR-2025-1142' },
  { id: 'W-0454', tipo: 'Metais pesados', volume: 0.8, unidade: 'kg', gerador: 'Lab-201', registrado: '2025-11-20', status: 'aguardando-coleta', composicao: 'Sais de Cu e Pb', risco: 'alto', mtr: null },
  { id: 'W-0455', tipo: 'Oxidantes', volume: 1.5, unidade: 'L', gerador: 'Lab-209', registrado: '2025-11-21', status: 'rotulagem', composicao: 'Hipoclorito diluído', risco: 'medio', mtr: null },
  { id: 'W-0456', tipo: 'Vidraria contaminada', volume: 3, unidade: 'kg', gerador: 'Lab-205', registrado: '2025-11-22', status: 'aguardando-coleta', composicao: 'Pipetas e béqueres com resíduo orgânico', risco: 'baixo', mtr: null },
  { id: 'W-0450', tipo: 'Solventes orgânicos não-halogenados', volume: 18.0, unidade: 'L', gerador: 'Lab-203', registrado: '2025-11-04', status: 'destinado', composicao: 'Etanol P.A.', risco: 'medio', mtr: 'MTR-2025-1088', destino: 'EcoQuímica SA', destinado_em: '2025-11-11' },
  { id: 'W-0449', tipo: 'Ácidos inorgânicos', volume: 5.0, unidade: 'L', gerador: 'Lab-201', registrado: '2025-10-28', status: 'destinado', composicao: 'HNO₃ + H₂SO₄', risco: 'alto', mtr: 'MTR-2025-1071', destino: 'EcoQuímica SA', destinado_em: '2025-11-05' },
];

export let MTRS = [
  { id: 'MTR-2025-1142', emissao: '2025-11-19', status: 'pendente-sinir', transportador: 'EcoLog Transportes', destinador: 'EcoQuímica SA', residuos: ['W-0453'], massa: 11.4, codigo_ibama: 'A099' },
  { id: 'MTR-2025-1088', emissao: '2025-11-04', status: 'aceito-sinir', transportador: 'EcoLog Transportes', destinador: 'EcoQuímica SA', residuos: ['W-0450'], massa: 16.2, codigo_ibama: 'A099' },
  { id: 'MTR-2025-1071', emissao: '2025-10-28', status: 'aceito-sinir', transportador: 'EcoLog Transportes', destinador: 'EcoQuímica SA', residuos: ['W-0449'], massa: 9.1, codigo_ibama: 'A002' },
  { id: 'MTR-2025-1053', emissao: '2025-10-10', status: 'aceito-sinir', transportador: 'CleanWaste', destinador: 'EcoQuímica SA', residuos: ['W-0440', 'W-0441'], massa: 22.6, codigo_ibama: 'A099' },
];

export let AUDITORIA = [
  { ts: '2025-11-22 09:14:22', who: 'Ana Lima', what: 'compat.check', where: 'Lab-201', detail: 'Verificou compatibilidade HCl + NaOH → bloqueado (risco 3)', risk: 'high' },
  { ts: '2025-11-22 09:10:08', who: 'Carlos Mendes', what: 'item.move', where: 'Lab-201/A/3', detail: 'Moveu R-00128 (HCl) para Armário A · Pra. 3', risk: 'low' },
  { ts: '2025-11-22 08:42:55', who: 'Renan Costa', what: 'item.consume', where: 'Lab-203', detail: 'Baixa de 0,2 L em R-00131 (Metanol)', risk: 'low' },
  { ts: '2025-11-21 17:22:00', who: 'sistema', what: 'alert.expiry', where: '-', detail: '3 reagentes com vencimento em < 90 dias', risk: 'med' },
  { ts: '2025-11-21 16:08:11', who: 'Júlia Reis', what: 'waste.create', where: 'Lab-205', detail: 'Registrou resíduo W-0451 — Solventes halogenados, 4.2 L', risk: 'low' },
  { ts: '2025-11-21 15:33:09', who: 'Ana Lima', what: 'label.generate', where: 'Lab-201', detail: 'Gerou rótulo GHS para R-00129 (H₂SO₄)', risk: 'low' },
  { ts: '2025-11-21 14:01:42', who: 'Carlos Mendes', what: 'mtr.draft', where: '-', detail: 'Criou pré-MTR MTR-2025-1142 (W-0453)', risk: 'low' },
  { ts: '2025-11-21 11:55:19', who: 'sistema', what: 'compat.block', where: 'Lab-205', detail: 'Bloqueio automático: tentativa de armazenar Peróxido junto a Solventes', risk: 'high' },
  { ts: '2025-11-21 10:14:30', who: 'Renan Costa', what: 'item.add', where: 'Lab-203', detail: 'Adicionou novo lote L-1188-D de Etanol Absoluto (12,5 L)', risk: 'low' },
  { ts: '2025-11-20 16:20:22', who: 'Ana Lima', what: 'waste.create', where: 'Lab-201', detail: 'Registrou resíduo W-0454 — Metais pesados, 0,8 kg', risk: 'low' },
  { ts: '2025-11-20 14:45:11', who: 'sistema', what: 'mtr.sinir.ack', where: '-', detail: 'MTR-2025-1071 aceito pelo SINIR', risk: 'low' },
  { ts: '2025-11-19 09:30:00', who: 'Júlia Reis', what: 'waste.create', where: 'Lab-205', detail: 'Registrou resíduo W-0452', risk: 'low' },
];

export let NOTIFICACOES = [
  { tipo: 'expiry', titulo: 'Acetona (R-00133) expira em 14 dias', sev: 'amber', t: '2h atrás' },
  { tipo: 'low-stock', titulo: 'Fluoreto de Sódio abaixo do estoque mínimo', sev: 'red', t: '5h atrás' },
  { tipo: 'sinir', titulo: 'MTR-2025-1142 aguarda envio ao SINIR', sev: 'amber', t: 'ontem' },
  { tipo: 'compat', titulo: 'Tentativa bloqueada: H₂O₂ + Solventes (Lab-205)', sev: 'red', t: 'ontem' },
  { tipo: 'coleta', titulo: '6 resíduos aguardando coleta há mais de 7 dias', sev: 'amber', t: 'ontem' },
];

export let GERACAO_MENSAL = [
  { mes: 'Mai', valor: 38 }, { mes: 'Jun', valor: 42 }, { mes: 'Jul', valor: 35 },
  { mes: 'Ago', valor: 48 }, { mes: 'Set', valor: 51 }, { mes: 'Out', valor: 44 },
  { mes: 'Nov', valor: 56 },
];

export let GERACAO_POR_LAB = [
  { lab: 'Lab-201 · Inorgânica', valor: 14.2, cor: 'amber' },
  { lab: 'Lab-203 · Orgânica', valor: 22.8, cor: '' },
  { lab: 'Lab-205 · Análise', valor: 8.4, cor: 'red' },
  { lab: 'Lab-209 · Geral', valor: 6.6, cor: 'green' },
  { lab: 'Lab-211 · Físico-Qca.', valor: 4.0, cor: '' },
];

export let CHAMADOS = [
  {
    id: 'RQ-3284', tipo: 'bug', severidade: 'alta', status: 'aberto',
    titulo: 'PDF do MTR sai com caractere ilegível no cabeçalho',
    descricao: 'Ao baixar o PDF do MTR-2025-1142, o nome do destinador aparece com "EcoQu?mica SA" — o "í" fica quebrado. Reproduzi 3x no Chrome 132.',
    reportado_por: 'Ana Lima', reportado_por_id: 'U-002',
    criado: '2025-11-21 14:32', responsavel: 'Lucas Souza',
    comentarios: [
      { autor: 'Lucas Souza', papel: 'admin', ts: '2025-11-21 14:48', texto: 'Recebi, vou investigar. Parece problema de encoding do gerador de PDF. Você consegue me enviar o PDF gerado anexo?' },
      { autor: 'Ana Lima', papel: 'coordenador', ts: '2025-11-21 15:02', texto: 'Acabei de mandar pelo e-mail. Acontece também com "ã" no nome do gerador.' },
    ],
    contexto: { tela: 'mtr', browser: 'Chrome 132 · macOS' },
  },
  {
    id: 'RQ-3281', tipo: 'feature', severidade: 'media', status: 'em-analise',
    titulo: 'Permitir filtrar inventário por múltiplos pictogramas GHS',
    descricao: 'Hoje só dá pra filtrar por uma classe de reatividade. Seria útil cruzar "inflamável + tóxico" pra inspeção.',
    reportado_por: 'Renan Costa', reportado_por_id: 'U-003',
    criado: '2025-11-20 09:14', responsavel: 'Lucas Souza',
    comentarios: [
      { autor: 'Lucas Souza', papel: 'admin', ts: '2025-11-20 10:30', texto: 'Faz sentido. Vou adicionar ao backlog do sprint 14.' },
      { autor: 'Renan Costa', papel: 'coordenador', ts: '2025-11-20 11:15', texto: 'Top. Se possível também incluir filtro por validade ≤ 90 dias junto, ajuda na auditoria semestral.' },
      { autor: 'Lucas Souza', papel: 'admin', ts: '2025-11-20 14:22', texto: 'Vou tratar isso como um chamado separado pra não acoplar. Abro outro hoje.' },
      { autor: 'Júlia Reis', papel: 'coordenador', ts: '2025-11-21 08:05', texto: '+1 aqui também. No Lab-205 esse cruzamento ajudaria pra mapear riscos do armário de oxidantes.' },
    ],
    contexto: { tela: 'inventario' },
  },
  {
    id: 'RQ-3278', tipo: 'ui', severidade: 'baixa', status: 'aberto',
    titulo: 'Botão "Salvar rascunho" do MTR fica colado no botão de PDF',
    descricao: 'No 1440px o gap entre os dois botões some. Reproduz no Safari 17.',
    reportado_por: 'Júlia Reis', reportado_por_id: 'U-004',
    criado: '2025-11-19 16:50', responsavel: null,
    comentarios: [],
    contexto: { tela: 'mtr', browser: 'Safari 17 · macOS' },
  },
  {
    id: 'RQ-3275', tipo: 'conformidade', severidade: 'critica', status: 'em-analise',
    titulo: 'Frase H219 ausente do banco para produtos da classe 11',
    descricao: 'Peróxidos não geram a frase H219 (oxidante) automaticamente. Isso pode invalidar o rótulo perante a CETESB.',
    reportado_por: 'Júlia Reis', reportado_por_id: 'U-004',
    criado: '2025-11-18 11:20', responsavel: 'Lucas Souza',
    comentarios: [
      { autor: 'Lucas Souza', papel: 'admin', ts: '2025-11-18 11:35', texto: 'Crítico mesmo. Vou validar com a Ana antes de fazer qualquer alteração no banco — pode afetar rótulos já impressos.' },
      { autor: 'Ana Lima', papel: 'coordenador', ts: '2025-11-18 14:12', texto: 'Confirmado pela NBR 14725-2. H219 deve constar em peróxidos a partir de 5% de concentração. Os nossos itens estão a 30%.' },
      { autor: 'Lucas Souza', papel: 'admin', ts: '2025-11-18 15:40', texto: 'Adicionei H219 ao bd e regerei os rótulos do R-00135 (H2O2 30%). Vou checar se há outros itens da classe 11 afetados.' },
      { autor: 'Lucas Souza', papel: 'admin', ts: '2025-11-19 09:18', texto: 'Apenas R-00135 no inventário ativo. Notificação manual enviada pra Júlia substituir o rótulo físico.' },
      { autor: 'Júlia Reis', papel: 'coordenador', ts: '2025-11-19 10:30', texto: 'Rótulo substituído. Aguardo confirmação da auditoria antes de fechar.' },
      { autor: 'Ana Lima', papel: 'coordenador', ts: '2025-11-20 11:05', texto: 'CETESB validou via e-mail. Pode marcar como resolvido após o teste de regressão.' },
      { autor: 'Lucas Souza', papel: 'admin', ts: '2025-11-21 16:00', texto: 'Em testes de regressão agora.' },
    ],
    contexto: { tela: 'detalhe' },
  },
  {
    id: 'RQ-3270', tipo: 'performance', severidade: 'media', status: 'resolvido',
    titulo: 'Tela de auditoria lenta com filtro "todos os períodos"',
    descricao: 'Carregamento de ~6s com 10k+ eventos. Travamento perceptível ao trocar filtros.',
    reportado_por: 'Carlos Mendes', reportado_por_id: 'U-005',
    criado: '2025-11-14 10:08', responsavel: 'Lucas Souza',
    resolvido: '2025-11-17 15:42',
    resolucao: 'Implementado memoização do filtro e índice por timestamp. Latência caiu para 240ms.',
    comentarios: [
      { autor: 'Lucas Souza', papel: 'admin', ts: '2025-11-14 11:00', texto: 'Reproduzi aqui. Vou medir antes de tocar — pode ser tanto o filtro quanto o render.' },
      { autor: 'Lucas Souza', papel: 'admin', ts: '2025-11-16 09:14', texto: 'Profiler aponta que 80% do tempo é no .filter() que percorre tudo a cada renderização. Vou memoizar.' },
      { autor: 'Carlos Mendes', papel: 'tecnico', ts: '2025-11-17 16:30', texto: 'Conferi agora, abrindo "todos os períodos" carrega instantâneo. Top.' },
    ],
    contexto: { tela: 'auditoria' },
  },
  {
    id: 'RQ-3265', tipo: 'bug', severidade: 'baixa', status: 'fechado',
    titulo: 'Modal de baixa não fecha com ESC quando há campo focado',
    descricao: 'Ao pressionar ESC com um input em foco, o modal não fecha.',
    reportado_por: 'Bruno Aragão', reportado_por_id: 'U-007',
    criado: '2025-11-10 13:45', responsavel: 'Lucas Souza',
    resolvido: '2025-11-12 09:30',
    resolucao: 'Não reproduzido — fechado como "funciona conforme esperado". ESC sai do input primeiro, segunda tecla fecha o modal.',
    comentarios: [
      { autor: 'Lucas Souza', papel: 'admin', ts: '2025-11-11 10:00', texto: 'Não consegui reproduzir. Que navegador você está usando?' },
      { autor: 'Bruno Aragão', papel: 'pesquisador', ts: '2025-11-11 14:20', texto: 'Firefox 121. Mas testei agora e funciona — talvez tenha sido cache. Pode fechar.' },
    ],
    contexto: { tela: 'detalhe' },
  },
];

export const PERMISSION_GROUPS = [
  { id: 'inventario', label: 'Inventário', icon: 'flask', items: [['inv.view','Visualizar inventário'],['inv.add','Cadastrar reagente'],['inv.edit','Editar ficha do reagente'],['inv.consume','Registrar baixa de estoque'],['inv.move','Mover entre armários'],['inv.delete','Excluir reagente']] },
  { id: 'residuos', label: 'Resíduos', icon: 'trash', items: [['res.view','Visualizar resíduos'],['res.register','Registrar novo resíduo'],['res.classify','Classificar / rotular'],['res.cancel','Cancelar registro']] },
  { id: 'mtr', label: 'Pré-MTR · SINIR', icon: 'truck', items: [['mtr.view','Visualizar MTRs'],['mtr.draft','Criar pré-MTR'],['mtr.sinir','Validar e enviar ao SINIR']] },
  { id: 'compat', label: 'Compatibilidade', icon: 'shield', items: [['compat.view','Consultar matriz'],['compat.override','Sobrepor bloqueio (c/ justificativa)']] },
  { id: 'labs', label: 'Laboratórios', icon: 'location', items: [['lab.view','Visualizar laboratórios'],['lab.create','Cadastrar laboratório'],['lab.edit','Editar laboratório'],['lab.archive','Arquivar laboratório']] },
  { id: 'rel', label: 'Auditoria & Relatórios', icon: 'audit', items: [['audit.view','Visualizar log de auditoria'],['audit.export','Exportar log em CSV'],['rel.view','Visualizar relatórios'],['rel.pgrs','Gerar / publicar PGRS']] },
  { id: 'sistema', label: 'Sistema', icon: 'settings', items: [['sys.users','Gerenciar usuários e permissões'],['sys.config','Configurações gerais'],['sys.mcp','Habilitar MCP Assistant / IA']] },
  { id: 'suporte', label: 'Suporte · Chamados', icon: 'warning', items: [['support.view','Visualizar chamados reportados'],['support.assign','Atribuir responsável'],['support.respond','Responder e atualizar status'],['support.resolve','Resolver / fechar chamado'],['support.delete','Excluir chamado']] },
];

export const ALL_PERMS = PERMISSION_GROUPS.flatMap(g => g.items.map(([k]) => k));

export const ROLES = {
  Admin:       { label: 'Administrador',         desc: 'Acesso total · gestor da plataforma',            cor: '#0d4a8c', perms: ALL_PERMS },
  Gestor:      { label: 'Gestor',                 desc: 'Responsável por um ou mais laboratórios',        cor: '#5b3c8c', perms: ALL_PERMS.filter(p => !p.startsWith('sys.')) },
  Tecnico:     { label: 'Técnico de laboratório', desc: 'Operação diária · estoque, baixa e resíduos',    cor: '#1f7a3e', perms: ['inv.view','inv.add','inv.edit','inv.consume','inv.move','res.view','res.register','res.classify','mtr.view','mtr.draft','compat.view','lab.view','audit.view','rel.view'] },
  Visualizador:{ label: 'Visualizador',           desc: 'Apenas leitura · auditoria externa',             cor: '#7b8493', perms: ['inv.view','res.view','mtr.view','compat.view','lab.view','audit.view','rel.view'] },
};

export const USUARIOS = [
  { id:'U-001', nome:'Lucas Souza',          email:'lucas.souza@instituto.example',       matricula:'2000000001', papel:'admin',       labs:['*'],               status:'ativo',    ultimo_acesso:'2025-11-22 09:42', criado:'2023-02-10', mfa:true,  perms:null, iniciais:'LS', cor:'#1465c0', voce:true },
  { id:'U-002', nome:'Profa. Ana Lima',      email:'ana.lima@instituto.example',          matricula:'2000000002', papel:'coordenador', labs:['Lab-201'],          status:'ativo',    ultimo_acesso:'2025-11-22 09:14', criado:'2023-02-14', mfa:true,  perms:null, iniciais:'AL', cor:'#5b3c8c' },
  { id:'U-003', nome:'Prof. Renan Costa',    email:'renan.costa@instituto.example',       matricula:'2000000003', papel:'coordenador', labs:['Lab-203','Lab-211'],status:'ativo',    ultimo_acesso:'2025-11-22 08:42', criado:'2023-02-14', mfa:true,  perms:null, iniciais:'RC', cor:'#b76e00' },
  { id:'U-004', nome:'Profa. Júlia Reis',    email:'julia.reis@instituto.example',        matricula:'2000000004', papel:'coordenador', labs:['Lab-205'],          status:'ativo',    ultimo_acesso:'2025-11-21 17:22', criado:'2023-05-08', mfa:true,  perms:null, iniciais:'JR', cor:'#0d4a8c' },
  { id:'U-005', nome:'Téc. Carlos Mendes',   email:'carlos.mendes@instituto.example',     matricula:'2000000005', papel:'tecnico',     labs:['Lab-201','Lab-209'],status:'ativo',    ultimo_acesso:'2025-11-22 09:10', criado:'2023-03-02', mfa:true,  perms:null, iniciais:'CM', cor:'#1f7a3e' },
  { id:'U-006', nome:'Téc. Eduardo Faria',   email:'eduardo.faria@instituto.example',     matricula:'2000000006', papel:'tecnico',     labs:['Lab-209'],          status:'ativo',    ultimo_acesso:'2025-11-21 16:08', criado:'2024-01-22', mfa:false, perms:null, iniciais:'EF', cor:'#b76e00' },
  { id:'U-007', nome:'Bruno Almeida',        email:'bruno.almeida@instituto.example',     matricula:'2000000007', papel:'pesquisador', labs:['Lab-203'],          status:'ativo',    ultimo_acesso:'2025-11-20 14:30', criado:'2024-03-10', mfa:false, perms:['inv.view','inv.consume','res.view','res.register','mtr.view','mtr.draft','compat.view','lab.view','rel.view'], iniciais:'BA', cor:'#1465c0' },
  { id:'U-008', nome:'Patrícia Nogueira',    email:'patricia.nogueira@instituto.example', matricula:'2000000008', papel:'pesquisador', labs:['Lab-205'],          status:'ativo',    ultimo_acesso:'2025-11-22 08:01', criado:'2024-03-10', mfa:true,  perms:null, iniciais:'PN', cor:'#5b3c8c' },
  { id:'U-009', nome:'Marina Toledo',        email:'marina.toledo@auditoria.gov.br',  matricula:'EXT-114',    papel:'visualizador',labs:['*'],               status:'ativo',    ultimo_acesso:'2025-11-18 11:50', criado:'2025-09-01', mfa:true,  perms:null, iniciais:'MT', cor:'#7b8493', externo:true },
  { id:'U-010', nome:'Diego Pereira',        email:'diego.pereira@instituto.example',     matricula:'2000000010', papel:'pesquisador', labs:['Lab-205'],          status:'pendente', ultimo_acesso:null,               criado:'2025-11-21', mfa:false, perms:null, iniciais:'DP', cor:'#1f7a3e' },
  { id:'U-011', nome:'Felipe Tavares',       email:'felipe.tavares@instituto.example',    matricula:'2000000011', papel:'pesquisador', labs:['Lab-203'],          status:'arquivado',ultimo_acesso:'2024-12-05 10:15', criado:'2022-08-15', arquivado:'2025-01-30', mfa:false, perms:null, iniciais:'FT', cor:'#7b8493' },
  { id:'U-012', nome:'Sandra Vieira',        email:'sandra.vieira@instituto.example',     matricula:'2000000012', papel:'pesquisador', labs:['Lab-201'],          status:'arquivado',ultimo_acesso:'2024-08-20 09:00', criado:'2021-04-02', arquivado:'2024-09-15', mfa:false, perms:null, iniciais:'SV', cor:'#7b8493' },
];
