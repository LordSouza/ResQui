import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { useAuth } from './AuthContext';

export function useLogin() {
  const { login } = useAuth();

  return useMutation({
    mutationFn: async ({ email, senha, codigo2fa }) => {
      let res;
      try {
        res = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ Email: email, Senha: senha, Codigo2fa: codigo2fa || null }),
        });
      } catch (e) {
        // apiFetch throws on 401 (wrong password) and on network errors
        const isUnauthorized = e.message === 'Unauthorized';
        throw new Error(isUnauthorized ? 'Credenciais inválidas' : 'Falha de conexão. Tente novamente.');
      }
      return res.json();
    },
    onSuccess: (data) => {
      // 2FA habilitado: o backend responde { requires2fa: true } e o token só vem na 2ª etapa
      if (data?.requires2fa) return;
      login(data.token, data.user);
    },
  });
}
