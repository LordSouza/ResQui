export const URL_DO_BLOG = '/blog/';

export const TUTORIAL_DO_FORMULARIO = {
  novoReagente: 'cadastrar-reagente',
  baixa: 'registrar-consumo',
  baixaLote: 'registrar-frasco',
  transferirReagente: 'transferir-reagente',
  importarCsv: 'importar-inventario',
  novoResiduo: 'registrar-residuo',
  rejeitarResiduo: 'aprovar-ou-rejeitar-descarte',
  novoMtr: 'emitir-manifesto',
  confirmarDestinacao: 'confirmar-destinacao',
  configurarPgrs: 'configurar-pgrs-e-gerar-relatorio',
  filtrosAuditoria: 'consultar-auditoria',
  novoLab: 'criar-laboratorio',
  convidarUsuario: 'convidar-aluno',
  laboratoriosUsuario: 'atribuir-laboratorios',
  senha2fa: 'ativar-verificacao-em-duas-etapas',
  aceitarConvite: 'aceitar-convite',
};

export function urlDoTutorial(formulario) {
  return `${URL_DO_BLOG}${TUTORIAL_DO_FORMULARIO[formulario]}/`;
}
