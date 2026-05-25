import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { useAuth } from './AuthContext';

export function useLogin() {
  const { login } = useAuth();

  return useMutation({
    mutationFn: async ({ email, senha }) => {
      let res;
      try {
        res = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ Email: email, Senha: senha }),
        });
      } catch (e) {
        // apiFetch throws on 401 (wrong password) and on network errors
        const isUnauthorized = e.message === 'Unauthorized';
        throw new Error(isUnauthorized ? 'Credenciais inválidas' : 'Falha de conexão. Tente novamente.');
      }
      if (!res.ok) throw new Error('Credenciais inválidas');
      return res.json();
    },
    onSuccess: (data) => {
      login(data.token, data.user);
    },
  });
}
