// Constantes de domínio do ResQui
// Classes de reatividade do ResQui (12). Mapeamento para os grupos de reatividade da EPA
// (EPA-600/2-80-076) e proveniência da matriz: docs/compatibilidade-proveniencia.md
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
  Professor: { label: 'Professor', desc: 'Responsável pelo laboratório · aprova descarte, cadastra e gere o sistema', cor: '#0f6e6e' },
  Aluno:     { label: 'Aluno',     desc: 'Solicita descarte e registra consumo',                                       cor: '#8c5b1f' },
};
