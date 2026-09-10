// frontend/tests/unit/permissoes.test.js
import { describe, it, expect } from 'vitest';
import { POLICIES, DESCRICAO_POLICY, podePor, podeVerTela, motivoTelaRestrita } from '../../src/auth/permissoes';

// Fonte da verdade: backend/ResQui.API/Program.cs:110-115. Se um caso aqui quebrar, o espelho
// saiu de sincronia com o servidor — corrija o espelho, não o teste, a menos que a policy do
// backend tenha mudado de propósito.
const ESPERADO = {
  Administracao: ['Professor'],
  Cadastro: ['Professor'],
  Operacao: ['Professor'],
  Operacional: ['Professor', 'Aluno'],
  Aprovador: ['Professor'],
  Supervisao: ['Professor'],
};

const TODOS_OS_PAPEIS = ['Professor', 'Aluno'];

describe('POLICIES espelha as policies do backend', () => {
  it('cobre exatamente as seis policies declaradas', () => {
    expect(Object.keys(POLICIES).sort()).toEqual(Object.keys(ESPERADO).sort());
  });

  it.each(Object.entries(ESPERADO))('a policy %s concede exatamente os papéis esperados', (policy, papeis) => {
    expect([...POLICIES[policy]].sort()).toEqual([...papeis].sort());
  });
});

describe('podePor', () => {
  it.each(Object.entries(ESPERADO))('decide %s para cada papel', (policy, concedidos) => {
    for (const papel of TODOS_OS_PAPEIS) {
      expect(podePor(papel, policy)).toBe(concedidos.includes(papel));
    }
  });

  it('nega quando o papel é desconhecido ou ausente', () => {
    expect(podePor(undefined, 'Operacional')).toBe(false);
    expect(podePor('Estagiario', 'Operacional')).toBe(false);
  });

  it('nega quando a policy não existe, em vez de estourar', () => {
    expect(podePor('Professor', 'PolicyInexistente')).toBe(false);
  });

  // Aluno só opera o próprio ciclo: solicita descarte e registra baixa.
  it('concede a Aluno apenas Operacional', () => {
    for (const policy of Object.keys(POLICIES)) {
      expect(podePor('Aluno', policy)).toBe(policy === 'Operacional');
    }
  });

  it('concede a Professor todas as policies', () => {
    for (const policy of Object.keys(POLICIES)) {
      expect(podePor('Professor', policy)).toBe(true);
    }
  });
});

describe('podeVerTela', () => {
  it('libera as telas sem policy para qualquer papel', () => {
    for (const papel of TODOS_OS_PAPEIS) {
      expect(podeVerTela(papel, 'dashboard')).toBe(true);
      expect(podeVerTela(papel, 'inventario')).toBe(true);
      expect(podeVerTela(papel, 'compat')).toBe(true);
    }
  });

  // GET /api/auditoria exige Supervisao.
  it.each([['Professor', true], ['Aluno', false]])
    ('auditoria para %s → %s', (papel, esperado) => {
      expect(podeVerTela(papel, 'auditoria')).toBe(esperado);
    });

  // Todo o grupo /api/usuarios exige Administracao.
  it.each([['Professor', true], ['Aluno', false]])
    ('usuarios para %s → %s', (papel, esperado) => {
      expect(podeVerTela(papel, 'usuarios')).toBe(esperado);
    });

  it('nega telas com policy quando o papel é desconhecido', () => {
    expect(podeVerTela(undefined, 'auditoria')).toBe(false);
    expect(podeVerTela(undefined, 'usuarios')).toBe(false);
  });
});

describe('motivoTelaRestrita', () => {
  it('nomeia os papéis da policy da tela, sem texto herdado de outra', () => {
    expect(motivoTelaRestrita('usuarios')).toBe('Esta tela é exclusiva de Professor.');
    expect(motivoTelaRestrita('auditoria')).toBe('Esta tela é exclusiva de Professor.');
  });

  it('devolve vazio para tela sem restrição', () => {
    expect(motivoTelaRestrita('dashboard')).toBe('');
  });
});

describe('DESCRICAO_POLICY', () => {
  it('descreve exatamente as policies existentes, sem sobra nem falta', () => {
    expect(Object.keys(DESCRICAO_POLICY).sort()).toEqual(Object.keys(POLICIES).sort());
  });

  it('não deixa descrição vazia', () => {
    for (const texto of Object.values(DESCRICAO_POLICY)) {
      expect(texto.trim().length).toBeGreaterThan(0);
    }
  });
});
