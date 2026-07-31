import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormPreviewMtrPdf } from '../../src/forms/residuos';

const mtr = {
  id: 7,
  numero: 'MTR-2026-0007',
  gerador: 'Lab de Química Geral',
  transportadora: 'Ecolog Transportes',
  destinador: 'Ecoquímica SA',
  codigo_ibama: 'A099',
  massa: 8.3,
  data_emissao: '2026-07-24T00:00:00Z',
  residuo_ids: [451, 452],
};

const residuos = [
  { id: 451, descricao: 'Solventes orgânicos halogenados', tipo: 'solvente', volume: 5.1, unidade: 'L', risco: 'alto', classes: [3, 7] },
  { id: 452, descricao: 'Soluções ácidas inorgânicas', tipo: 'ácido', volume: 2.4, unidade: 'L', risco: 'medio', classes: [2] },
];

describe('FormPreviewMtrPdf — espelha o MTR real', () => {
  afterEach(() => vi.restoreAllMocks());

  it('mostra os dados reais do MTR e dos resíduos', () => {
    render(<FormPreviewMtrPdf mtr={mtr} residuos={residuos} onClose={vi.fn()} />);
    expect(document.body.textContent).toContain('MTR-2026-0007');
    expect(document.body.textContent).toContain('Lab de Química Geral');
    expect(document.body.textContent).toContain('Ecolog Transportes');
    expect(document.body.textContent).toContain('Ecoquímica SA');
    expect(screen.getByText('Solventes orgânicos halogenados')).toBeInTheDocument();
    expect(screen.getByText('Soluções ácidas inorgânicas')).toBeInTheDocument();
    expect(document.body.textContent).toContain('8.30'); // massa total kg
  });

  it('NÃO fabrica dados sem fonte no backend (CNPJ, hash, número fixo)', () => {
    render(<FormPreviewMtrPdf mtr={mtr} residuos={residuos} onClose={vi.fn()} />);
    expect(document.body.textContent).not.toMatch(/\d{2}\.\d{3}\.\d{3}\/\d{4}/); // CNPJ
    expect(document.body.textContent).not.toMatch(/SHA-256/i);
    expect(document.body.textContent).not.toContain('MTR-2025-1143');
    expect(document.body.textContent).not.toMatch(/CRQ/i);
  });

  it('inclui o disclaimer de uso interno (não substitui o MTR oficial)', () => {
    render(<FormPreviewMtrPdf mtr={mtr} residuos={residuos} onClose={vi.fn()} />);
    expect(document.body.textContent).toMatch(/não substitui o MTR oficial/i);
  });
});
