// frontend/tests/unit/permissoes.test.js
import { describe, it, expect } from 'vitest';
import { POLICIES, podePor, podeVerTela, motivoTelaRestrita } from '../../src/auth/permissoes';

// Fonte da verdade: backend/ResQui.API/Program.cs:110-115. Se um caso aqui quebrar, o espelho
// saiu de sincronia com o servidor — corrija o espelho, não o teste, a menos que a policy do
// backend tenha mudado de propósito.
const ESPERADO = {
  Admin: ['Admin'],
  Gestor: ['Admin', 'Gestor'],
  Tecnico: ['Admin', 'Gestor', 'Tecnico'],
  Operacional: ['Admin', 'Gestor', 'Tecnico', 'Pesquisador', 'Professor'],
  Aprovador: ['Admin', 'Gestor', 'Professor'],
  Supervisao: ['Admin', 'Gestor', 'Professor'],
};

const TODOS_OS_PAPEIS = ['Admin', 'Gestor', 'Professor', 'Tecnico', 'Pesquisador', 'Visualizador'];

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
    expect(podePor('Admin', 'PolicyInexistente')).toBe(false);
  });

  // Visualizador é o papel de leitura externa: nenhuma policy de escrita o alcança.
  it('não concede nenhuma policy a Visualizador', () => {
    for (const policy of Object.keys(POLICIES)) {
      expect(podePor('Visualizador', policy)).toBe(false);
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

  // GET /api/auditoria exige Supervisao: Admin, Gestor ou Professor.
  it.each([['Admin', true], ['Gestor', true], ['Professor', true], ['Tecnico', false], ['Pesquisador', false], ['Visualizador', false]])
    ('auditoria para %s → %s', (papel, esperado) => {
      expect(podeVerTela(papel, 'auditoria')).toBe(esperado);
    });

  // Todo o grupo /api/usuarios exige Admin.
  it.each([['Admin', true], ['Gestor', false], ['Professor', false], ['Tecnico', false], ['Pesquisador', false], ['Visualizador', false]])
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
    expect(motivoTelaRestrita('usuarios')).toBe('Esta tela é exclusiva de Admin.');
    expect(motivoTelaRestrita('auditoria')).toBe('Esta tela é restrita a Admin, Gestor e Professor.');
  });

  it('devolve vazio para tela sem restrição', () => {
    expect(motivoTelaRestrita('dashboard')).toBe('');
  });
});
