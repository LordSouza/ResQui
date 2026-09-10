import { useAuth } from './AuthContext';

// Espelho das policies declaradas em backend/ResQui.API/Program.cs — a autorização real é a do
// servidor; isto existe só para não oferecer na UI um controle que a API vai recusar com 403.
// Ao mexer numa policy lá, mexa aqui.
export const POLICIES = {
  Administracao: ['Professor'],
  Cadastro: ['Professor'],
  Operacao: ['Professor'],
  Operacional: ['Professor', 'Aluno'],
  Aprovador: ['Professor'],
  Supervisao: ['Professor'],
};

// O que cada policy libera, em linguagem de usuário. Fonte única do que o PermissoesDrawer exibe:
// sem isto ele voltaria a manter uma lista paralela, que foi o que esta fatia removeu.
export const DESCRICAO_POLICY = {
  Administracao: 'Gerir usuários e papéis, resetar 2FA, excluir reagente e laboratório',
  Cadastro: 'Cadastrar e editar reagentes e laboratórios, importar CSV, gerar relatórios, configurar o PGRS',
  Operacao: 'Emitir manifesto, confirmar destinação, gerir lotes e editar resíduo',
  Operacional: 'Solicitar descarte, registrar baixa e transferir reagente',
  Aprovador: 'Aprovar e rejeitar solicitações de descarte',
  Supervisao: 'Consultar o log de auditoria',
};

export function podePor(papel, policy) {
  return (POLICIES[policy] ?? []).includes(papel);
}

// Telas cujo conteúdo inteiro depende de um endpoint com policy: entrar nelas sem o papel só
// renderiza erro de carregamento. As demais são legíveis por qualquer usuário autenticado.
export const POLICY_POR_TELA = {
  auditoria: 'Supervisao', // GET /api/auditoria
  usuarios: 'Administracao', // grupo /api/usuarios inteiro
};

// Texto exibido quando o papel não alcança a tela. Derivado do mapa acima para que uma tela nova
// em POLICY_POR_TELA não herde a explicação de outra.
export function motivoTelaRestrita(screen) {
  const policy = POLICY_POR_TELA[screen];
  if (!policy) return '';
  const papeis = POLICIES[policy] ?? [];
  return papeis.length === 1
    ? `Esta tela é exclusiva de ${papeis[0]}.`
    : `Esta tela é restrita a ${papeis.slice(0, -1).join(', ')} e ${papeis.at(-1)}.`;
}

export function podeVerTela(papel, screen) {
  const policy = POLICY_POR_TELA[screen];
  return !policy || podePor(papel, policy);
}

// Hook de conveniência: usePode('Cadastro') dentro de uma screen.
export function usePode(policy) {
  const { user } = useAuth();
  return podePor(user?.papel, policy);
}
