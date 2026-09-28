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
  total_litros: 7.5,
  total_quilos: 0,
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
    expect(document.body.textContent).toContain('7,500 L');
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

  it('formata as quantidades das linhas como o PDF, com duas casas e vírgula', () => {
    render(<FormPreviewMtrPdf mtr={mtr} residuos={residuos} onClose={vi.fn()} />);
    expect(document.body.textContent).toContain('5,10 L');
    expect(document.body.textContent).toContain('2,40 L');
    expect(document.body.textContent).not.toContain('#451');
  });

  it('manifesto pendente mostra Destinação: Pendente e duas assinaturas', () => {
    render(<FormPreviewMtrPdf mtr={{ ...mtr, data_destinacao: null }} residuos={residuos} onClose={vi.fn()} />);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Destinação confirmada');
    expect(screen.queryByText('Responsável pelo destinador')).not.toBeInTheDocument();
  });

  it('manifesto destinado mostra a data, quem confirmou e a assinatura do destinador', () => {
    render(<FormPreviewMtrPdf mtr={{ ...mtr, data_destinacao: '2026-08-01', destinado_por_nome: 'Maria Souza' }}
      residuos={residuos} onClose={vi.fn()} />);
    expect(document.body.textContent).toContain('Destinação confirmada em 01/08/2026 · Maria Souza');
    expect(screen.getByText('Responsável pelo destinador')).toBeInTheDocument();
  });

  it('manifesto destinado sem nome resolvido mantém a data e omite o nome', () => {
    render(<FormPreviewMtrPdf mtr={{ ...mtr, data_destinacao: '2026-08-01', destinado_por_nome: null }}
      residuos={residuos} onClose={vi.fn()} />);
    expect(document.body.textContent).toContain('Destinação confirmada em 01/08/2026');
    expect(document.body.textContent).not.toContain('01/08/2026 ·');
  });

  it('mostra as linhas de outros laboratórios como o PDF: sem identificação, só com a quantidade, depois das próprias', () => {
    const misto = { ...mtr, residuo_ids: [451], residuos_de_outros_laboratorios: [{ volume: 3, unidade: 'kg' }] };
    render(<FormPreviewMtrPdf mtr={misto} residuos={[residuos[0]]} onClose={vi.fn()} />);

    expect(screen.getByText(/RESÍDUOS \(2\)/)).toBeInTheDocument();
    const linhas = screen.getAllByRole('row').slice(1).map(tr => tr.textContent);
    expect(linhas[0]).toContain('Solventes orgânicos halogenados');
    expect(linhas[1]).toContain('Resíduo de outro laboratório');
    expect(linhas[1]).toContain('3,00 kg');
    expect(linhas[1]).not.toContain('451');
  });
});
