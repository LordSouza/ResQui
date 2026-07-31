import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormAtalhos } from '../../src/forms/sistema';

describe('FormAtalhos', () => {
  it('lista os atalhos que existem', () => {
    render(<FormAtalhos onClose={vi.fn()} />);

    expect(screen.getByText(/abrir busca global/i)).toBeInTheDocument();
    expect(screen.getByText(/fechar busca/i)).toBeInTheDocument();
    expect(screen.getByText(/mostrar este painel/i)).toBeInTheDocument();
    expect(screen.getByText(/abrir\/fechar chat mcp/i)).toBeInTheDocument();
    expect(screen.getByText(/enviar mensagem/i)).toBeInTheDocument();
    expect(screen.getByText(/nova linha na mensagem/i)).toBeInTheDocument();
    expect(screen.getByText(/fechar modal/i)).toBeInTheDocument();
  });

  it('envio do chat é Enter puro (Shift+Enter é nova linha) — não anuncia ⌘/Ctrl', () => {
    render(<FormAtalhos onClose={vi.fn()} />);

    const linha = screen.getByText(/enviar mensagem no chat/i).closest('div');
    expect(linha.textContent).not.toMatch(/⌘|ctrl/i);
    expect(linha.textContent).toMatch(/enter/i);
  });

  it('atalhos com modificador anunciam a forma Mac e a forma Windows/Linux', () => {
    render(<FormAtalhos onClose={vi.fn()} />);

    const buscaLinha = screen.getByText(/abrir busca global/i).closest('div');
    expect(buscaLinha.textContent).toMatch(/⌘/);
    expect(buscaLinha.textContent).toMatch(/ctrl/i);

    const chatLinha = screen.getByText(/abrir\/fechar chat mcp/i).closest('div');
    expect(chatLinha.textContent).toMatch(/⌘/);
    expect(chatLinha.textContent).toMatch(/ctrl/i);
  });

  it('não anuncia atalhos que não existem', () => {
    const { container } = render(<FormAtalhos onClose={vi.fn()} />);
    const texto = container.textContent;

    expect(texto).not.toMatch(/ir para dashboard/i);
    expect(texto).not.toMatch(/ir para inventário/i);
    expect(texto).not.toMatch(/ir para resíduos/i);
    expect(texto).not.toMatch(/ir para pré-mtr/i);
    expect(texto).not.toMatch(/ir para auditoria/i);
    expect(texto).not.toMatch(/novo reagente/i);
    expect(texto).not.toMatch(/novo resíduo/i);
    expect(texto).not.toMatch(/novo pré-mtr/i);
    expect(texto).not.toMatch(/baixar consumo do item atual/i);
    expect(texto).not.toMatch(/salvar rascunho/i);
    expect(texto).not.toMatch(/focar busca da tela atual/i);
    expect(texto).not.toMatch(/sair da conta/i);
    expect(texto).not.toMatch(/imprimir rótulo/i);
    expect(texto).not.toMatch(/resumo de segurança/i);
  });
});
