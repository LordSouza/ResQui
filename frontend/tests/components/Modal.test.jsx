import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '../../src/forms/Modal';

function renderModal(onClose = vi.fn()) {
  render(
    <>
      <button type="button">Abrir</button>
      <Modal title="Registrar resíduo" sub="Segue para aprovação" onClose={onClose}
        footer={<button type="button" onClick={onClose}>Cancelar</button>}>
        <label htmlFor="campo-composicao">Composição</label>
        <input id="campo-composicao" />
      </Modal>
    </>
  );
  return onClose;
}

function clicarNoVeu() {
  return userEvent.click(document.querySelector('.modal-backdrop'));
}

describe('Modal', () => {
  it('se anuncia como diálogo modal nomeado pelo título e descrito pelo subtítulo', () => {
    renderModal();
    const dialogo = screen.getByRole('dialog', { name: 'Registrar resíduo' });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveAccessibleDescription('Segue para aprovação');
  });

  it('leva o foco ao primeiro campo do corpo', () => {
    renderModal();
    expect(screen.getByLabelText('Composição')).toHaveFocus();
  });

  it('mantém o Tab dentro do diálogo', async () => {
    renderModal();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Fechar janela' })).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });

  it('fecha pelo véu quando nada foi preenchido', async () => {
    const onClose = renderModal();
    await clicarNoVeu();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não descarta o que foi preenchido com um clique no véu', async () => {
    const onClose = renderModal();
    await userEvent.type(screen.getByLabelText('Composição'), 'Acetona 70%');
    await clicarNoVeu();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('descarta o que foi preenchido');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar editando' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Composição')).toHaveValue('Acetona 70%');
  });

  it('descarta depois da confirmação, também pelo Esc', async () => {
    const onClose = renderModal();
    await userEvent.type(screen.getByLabelText('Composição'), 'x');
    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('devolve o foco a quem estava focado antes de abrir', () => {
    const { unmount } = render(<button type="button">Abrir</button>);
    const gatilho = screen.getByRole('button', { name: 'Abrir' });
    gatilho.focus();
    const { unmount: fecharModal } = render(<Modal title="T" onClose={vi.fn()}><input aria-label="Campo" /></Modal>);
    expect(screen.getByLabelText('Campo')).toHaveFocus();
    fecharModal();
    expect(gatilho).toHaveFocus();
    unmount();
  });

  it('trata o resumo da seção recolhida como último campo e volta ao início', async () => {
    render(
      <Modal title="Novo reagente" onClose={vi.fn()}>
        <input aria-label="Nome" />
        <details>
          <summary>Classificação GHS</summary>
          <input aria-label="Frases H" />
        </details>
      </Modal>
    );
    screen.getByText('Classificação GHS').focus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Fechar janela' })).toHaveFocus();
  });
});

