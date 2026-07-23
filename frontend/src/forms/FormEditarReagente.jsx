import { useState } from 'react';
import Modal from './Modal';
import { useAtualizarReagente } from '../reagentes/useAtualizarReagente';
import { useLocais } from '../laboratorios/useLocais';
import { useUsuarios } from '../usuarios/useUsuarios';

export function FormEditarReagente({ reagente, onClose, dispatch }) {
  const [f, setF] = useState({
    Nome: reagente.nome,
    Estoque: reagente.estoque,
    EstoqueMin: reagente.estoque_min ?? '',
    Local: reagente.local,
    Responsavel: reagente.responsavel,
    Validade: reagente.validade ?? '',
  });
  const mutation = useAtualizarReagente();
  const { locais, isPending: locaisPending, isError: locaisError } = useLocais();
  const { data: usuarios = [], isPending: usuariosPending, isError: usuariosError } = useUsuarios();
  const responsaveis = usuarios.filter(u => u.status === 'ativo').sort((a, b) => a.nome.localeCompare(b.nome));
  const respNomes = responsaveis.map(u => u.nome);
  // preserva valor legado (fora da lista derivada) como opção selecionável
  const localOptions = f.Local && !locais.includes(f.Local) ? [f.Local, ...locais] : locais;
  const respOptions = f.Responsavel && !respNomes.includes(f.Responsavel) ? [f.Responsavel, ...respNomes] : respNomes;
  const upd = (k, v) => setF(s => ({ ...s, [k]: v }));

  const submit = () => {
    if (!f.Nome) return;
    mutation.mutate(
      {
        id: reagente.id,
        Nome: f.Nome,
        Estoque: Number(f.Estoque) || 0,
        EstoqueMin: f.EstoqueMin !== '' ? Number(f.EstoqueMin) : null,
        Local: f.Local,
        Responsavel: f.Responsavel,
        Validade: f.Validade || null,
      },
      {
        onSuccess: () => {
          dispatch({ type: 'closeModal' });
          dispatch({ type: 'refresh' });
        },
      }
    );
  };

  return (
    <Modal
      title="Editar reagente"
      sub={`${reagente.nome} · ${reagente.id}`}
      onClose={onClose}
      width={520}
      footer={
        <>
          <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </>
      }
    >
      {mutation.isError && (
        <div className="login-err" style={{marginBottom: 12}}>{mutation.error.message}</div>
      )}
      <div className="form-row">
        <div className="field">
          <label htmlFor="edit-nome">Nome</label>
          <input id="edit-nome" aria-label="Nome do reagente" value={f.Nome} onChange={e => upd('Nome', e.target.value)}/>
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="edit-estoque">Estoque</label>
          <input id="edit-estoque" aria-label="Estoque atual" type="number" step="0.01" value={f.Estoque} onChange={e => upd('Estoque', e.target.value)}/>
        </div>
        <div className="field">
          <label htmlFor="edit-estoque-min">Estoque mínimo</label>
          <input id="edit-estoque-min" aria-label="Estoque mínimo" type="number" step="0.01" value={f.EstoqueMin} onChange={e => upd('EstoqueMin', e.target.value)}/>
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="edit-local">Localização</label>
          <select id="edit-local" aria-label="Localização do reagente" value={f.Local} onChange={e => upd('Local', e.target.value)} disabled={locaisPending}>
            <option value="">{locaisPending ? 'Carregando…' : locaisError ? 'Erro ao carregar' : 'Selecione…'}</option>
            {localOptions.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="edit-responsavel">Responsável</label>
          <select id="edit-responsavel" aria-label="Responsável pelo reagente" value={f.Responsavel} onChange={e => upd('Responsavel', e.target.value)} disabled={usuariosPending}>
            <option value="">{usuariosPending ? 'Carregando…' : usuariosError ? 'Erro ao carregar' : 'Selecione…'}</option>
            {respOptions.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="edit-validade">Validade</label>
          <input id="edit-validade" aria-label="Data de validade" type="date" value={f.Validade} onChange={e => upd('Validade', e.target.value)}/>
        </div>
      </div>
    </Modal>
  );
}
