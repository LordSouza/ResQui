import { useAuth } from '../auth/AuthContext';
import { useLaboratorios } from './useLaboratorios';

export function useLaboratoriosDoUsuario() {
  const { user } = useAuth();
  const { data: labs = [], isPending, isError } = useLaboratorios();
  const escopoCarregando = user?.papel !== 'Admin' && user?.laboratorioIds === undefined;
  const atribuidos = user?.laboratorioIds ?? [];
  const laboratorios = user?.papel === 'Admin' ? labs : labs.filter(l => atribuidos.includes(l.id));
  const respondePor = (labId) => user?.papel === 'Admin' || atribuidos.includes(labId);
  return { laboratorios, respondePor, isPending: isPending || escopoCarregando, isError };
}
