// Constantes de domínio do ResQui
// Classes de reatividade do ResQui (12), mapeadas para os grupos de reatividade da EPA
// (EPA-600/2-80-076).
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

export const TIPOS_RESIDUO = [
  'Solventes orgânicos não-halogenados',
  'Solventes halogenados',
  'Ácidos inorgânicos',
  'Ácidos orgânicos',
  'Bases inorgânicas',
  'Metais pesados',
  'Oxidantes',
  'Compostos cianetos',
  'Vidraria contaminada',
  'Material biológico contaminado',
];

export const CODIGOS_IBAMA = [
  { codigo: '16 05 06*', descricao: 'Produtos químicos de laboratório contendo ou compostos por substâncias perigosas, incluindo misturas de produtos químicos de laboratório' },
  { codigo: '16 05 07*', descricao: 'Produtos químicos inorgânicos de laboratório contendo ou compostos por substâncias perigosas' },
  { codigo: '16 05 08*', descricao: 'Produtos químicos orgânicos fora de uso contendo ou compostos por substâncias perigosas' },
  { codigo: '14 06 02*', descricao: 'Outros solventes e misturas de solventes halogenados' },
  { codigo: '14 06 03*', descricao: 'Outros solventes e misturas de solventes' },
  { codigo: '06 01 06*', descricao: 'Outros ácidos' },
  { codigo: '06 02 05*', descricao: 'Outras bases' },
  { codigo: '06 03 11*', descricao: 'Sais no estado sólido e em soluções contendo cianetos' },
  { codigo: '06 04 04*', descricao: 'Resíduos contendo mercúrio' },
  { codigo: '06 04 05*', descricao: 'Resíduos contendo outros metais pesados' },
  { codigo: '16 09 04*', descricao: 'Substâncias oxidantes não anteriormente especificadas' },
  { codigo: '16 10 01*', descricao: 'Resíduos líquidos aquosos contendo substâncias perigosas' },
  { codigo: '15 01 10*', descricao: 'Embalagens contendo ou contaminadas por resíduos de substâncias perigosas' },
  { codigo: '15 02 02*', descricao: 'Absorventes, materiais filtrantes, panos de limpeza e vestuário de proteção contaminados por substâncias perigosas' },
  { codigo: '18 01 01*', descricao: 'Culturas e estoques de microrganismos, meios de cultura e instrumentais de inoculação; resíduos de laboratórios de manipulação genética' },
];

export const CODIGO_IBAMA_MISTURA = '16 05 06*';

export const CODIGO_IBAMA_POR_TIPO = {
  'Solventes orgânicos não-halogenados': '14 06 03*',
  'Solventes halogenados': '14 06 02*',
  'Ácidos inorgânicos': '06 01 06*',
  'Ácidos orgânicos': '06 01 06*',
  'Bases inorgânicas': '06 02 05*',
  'Metais pesados': '06 04 05*',
  'Oxidantes': '16 09 04*',
  'Compostos cianetos': '06 03 11*',
  'Vidraria contaminada': '15 01 10*',
  'Material biológico contaminado': '18 01 01*',
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

export const ROLES = {
  Admin:     { label: 'Administrador', desc: 'Administra a plataforma · gerencia as contas de professor',                cor: '#0d4a8c' },
  Professor: { label: 'Professor',     desc: 'Responsável pelo laboratório · aprova descarte, cadastra e gere os alunos', cor: '#0f6e6e' },
  Aluno:     { label: 'Aluno',         desc: 'Cadastra reagente, solicita descarte e registra consumo',                 cor: '#8c5b1f' },
};

export const CLASSE_POR_TIPO = {
  'Solventes orgânicos não-halogenados': 5,
  'Solventes halogenados': 6,
  'Ácidos inorgânicos': 1,
  'Ácidos orgânicos': 2,
  'Bases inorgânicas': 3,
  'Metais pesados': 7,
  'Oxidantes': 4,
  'Compostos cianetos': 8,
};

export const UNIDADE_PADRAO_RESIDUO = 'L';

export const UNIDADE_POR_TIPO = {
  'Vidraria contaminada': 'kg',
  'Material biológico contaminado': 'kg',
};
