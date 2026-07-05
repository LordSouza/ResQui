// Constantes de domínio do ResQui
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

export const PERMISSION_GROUPS = [
  { id: 'inventario', label: 'Inventário', icon: 'flask', items: [['inv.view','Visualizar inventário'],['inv.add','Cadastrar reagente'],['inv.edit','Editar ficha do reagente'],['inv.consume','Registrar baixa de estoque'],['inv.move','Mover entre armários'],['inv.delete','Excluir reagente']] },
  { id: 'residuos', label: 'Resíduos', icon: 'trash', items: [['res.view','Visualizar resíduos'],['res.register','Registrar novo resíduo'],['res.classify','Classificar / rotular'],['res.approve','Aprovar / rejeitar descarte'],['res.cancel','Cancelar registro']] },
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
  Professor:   { label: 'Professor responsável',  desc: 'Supervisão · aprova descarte e acompanha o lab', cor: '#0f6e6e', perms: ['inv.view','inv.consume','res.view','res.register','res.classify','res.approve','mtr.view','compat.view','lab.view','audit.view','rel.view'] },
  Tecnico:     { label: 'Técnico de laboratório', desc: 'Operação diária · estoque, baixa e resíduos',    cor: '#1f7a3e', perms: ['inv.view','inv.add','inv.edit','inv.consume','inv.move','res.view','res.register','res.classify','mtr.view','mtr.draft','compat.view','lab.view','audit.view','rel.view'] },
  Pesquisador: { label: 'Aluno / Pesquisador',    desc: 'Solicita descarte e registra consumo',           cor: '#8c5b1f', perms: ['inv.view','inv.consume','res.view','res.register','res.classify','mtr.view','compat.view','lab.view'] },
  Visualizador:{ label: 'Visualizador',           desc: 'Apenas leitura · auditoria externa',             cor: '#7b8493', perms: ['inv.view','res.view','mtr.view','compat.view','lab.view','audit.view','rel.view'] },
};

// Locais de armazenamento (Laboratório · Armário · Prateleira).
// Lista fixa — desconectada dos laboratórios reais (débito pré-existente, fora do escopo do RF02).
export const LOCAIS = [
  'Lab-201 · Armário A · Pra. 1',
  'Lab-201 · Armário B · Pra. 2',
  'Lab-201 · Armário D · Pra. 4',
  'Lab-203 · Armário Inflamáveis · Pra. 1',
  'Lab-203 · Armário Inflamáveis · Pra. 2',
  'Lab-205 · Armário C · Pra. 1',
  'Lab-205 · Armário Oxidantes · Pra. 1',
  'Lab-209 · Armário Oxidantes · Pra. 2',
];
