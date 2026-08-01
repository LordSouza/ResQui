// frontend/tests/unit/permissoes.test.js
import { describe, it, expect } from 'vitest';
import { POLICIES, podePor } from '../../src/auth/permissoes';

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
