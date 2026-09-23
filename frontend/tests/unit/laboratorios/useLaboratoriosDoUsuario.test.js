import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('../../../src/laboratorios/useLaboratorios', () => ({ useLaboratorios: vi.fn() }));
vi.mock('../../../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));

import { useLaboratoriosDoUsuario } from '../../../src/laboratorios/useLaboratoriosDoUsuario';
import { useLaboratorios } from '../../../src/laboratorios/useLaboratorios';
import { useAuth } from '../../../src/auth/AuthContext';

const LABS = [
  { id: 'Lab-001', nome: 'Química Inorgânica' },
  { id: 'Lab-002', nome: 'Química Orgânica' },
];

beforeEach(() => {
  useLaboratorios.mockReturnValue({ data: LABS, isPending: false, isError: false });
});

describe('useLaboratoriosDoUsuario', () => {
  it('dá todos os laboratórios ao Admin, sem consultar o vínculo', () => {
    useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Admin' } });

    const { result } = renderHook(() => useLaboratoriosDoUsuario());

    expect(result.current.laboratorios).toEqual(LABS);
    expect(result.current.respondePor('Lab-002')).toBe(true);
    expect(result.current.isPending).toBe(false);
  });

  it('recorta a lista pelos laboratórios do usuário', () => {
    useAuth.mockReturnValue({ user: { id: 'u-2', papel: 'Professor', laboratorioIds: ['Lab-002'] } });

    const { result } = renderHook(() => useLaboratoriosDoUsuario());

    expect(result.current.laboratorios).toEqual([LABS[1]]);
    expect(result.current.respondePor('Lab-002')).toBe(true);
    expect(result.current.respondePor('Lab-001')).toBe(false);
    expect(result.current.isPending).toBe(false);
  });

  it('segue carregando enquanto o vínculo do usuário ainda não chegou do /me', () => {
    useAuth.mockReturnValue({ user: { id: 'u-3', papel: 'Professor' } });

    const { result } = renderHook(() => useLaboratoriosDoUsuario());

    expect(result.current.isPending).toBe(true);
  });

  it('distingue vínculo ausente de vínculo vazio: lista vazia não é carregamento', () => {
    useAuth.mockReturnValue({ user: { id: 'u-4', papel: 'Aluno', laboratorioIds: [] } });

    const { result } = renderHook(() => useLaboratoriosDoUsuario());

    expect(result.current.isPending).toBe(false);
    expect(result.current.laboratorios).toEqual([]);
    expect(result.current.respondePor('Lab-001')).toBe(false);
  });

  it('propaga o carregamento e o erro da consulta de laboratórios', () => {
    useLaboratorios.mockReturnValue({ data: undefined, isPending: true, isError: true });
    useAuth.mockReturnValue({ user: { id: 'u-5', papel: 'Professor', laboratorioIds: ['Lab-001'] } });

    const { result } = renderHook(() => useLaboratoriosDoUsuario());

    expect(result.current.isPending).toBe(true);
    expect(result.current.isError).toBe(true);
    expect(result.current.laboratorios).toEqual([]);
  });
});
