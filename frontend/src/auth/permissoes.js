import { useAuth } from './AuthContext';

// Espelho das policies declaradas em backend/ResQui.API/Program.cs:110-115 — a autorização real é
// a do servidor; isto existe só para não oferecer na UI um controle que a API vai recusar com 403.
// Ao mexer numa policy lá, mexa aqui.
export const POLICIES = {
  Admin: ['Admin'],
  Gestor: ['Admin', 'Gestor'],
  Tecnico: ['Admin', 'Gestor', 'Tecnico'],
  Operacional: ['Admin', 'Gestor', 'Tecnico', 'Pesquisador', 'Professor'],
  Aprovador: ['Admin', 'Gestor', 'Professor'],
  Supervisao: ['Admin', 'Gestor', 'Professor'],
};

export function podePor(papel, policy) {
  return (POLICIES[policy] ?? []).includes(papel);
}

// Hook de conveniência: usePode('Gestor') dentro de uma screen.
export function usePode(policy) {
  const { user } = useAuth();
  return podePor(user?.papel, policy);
}
