import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { useAuth } from './AuthContext';

export function useLogin() {
  const { login } = useAuth();

  return useMutation({
    mutationFn: async ({ email, senha }) => {
      try {
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ Email: email, Senha: senha }),
        });
        if (!res.ok) throw new Error('Credenciais inválidas');
        return res.json();
      } catch {
        throw new Error('Credenciais inválidas');
      }
    },
    onSuccess: (data) => {
      login(data.token, data.user);
    },
  });
}
