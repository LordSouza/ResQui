import { useState } from 'react';
import Modal from './Modal';
import { useAtualizarReagente } from '../reagentes/useAtualizarReagente';
import { SeletorLocal, erroDoLocal } from './SeletorLocal';

export function FormEditarReagente({ reagente, onClose, dispatch }) {
  const [f, setF] = useState({
    Nome: reagente.nome,
    EstoqueMin: reagente.estoque_min ?? '',
    Local: reagente.laboratorioId
      ? { laboratorioId: reagente.laboratorioId, armario: reagente.armario ?? '' }
      : { laboratorioId: '', armario: '' },
    Validade: reagente.validade ?? '',
  });
  const [erroLocal, setErroLocal] = useState('');
  const mutation = useAtualizarReagente();
  const upd = (k, v) => setF(s => ({ ...s, [k]: v }));

  const submit = () => {
    if (!f.Nome) return;
    setErroLocal(erroDoLocal(f.Local));
    if (erroDoLocal(f.Local)) return;
    mutation.mutate(
      {
        id: reagente.id,
        Nome: f.Nome,
        EstoqueMin: f.EstoqueMin !== '' ? Number(f.EstoqueMin) : null,
        LaboratorioId: f.Local.laboratorioId,
        Armario: f.Local.armario,
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
          <label htmlFor="edit-estoque-min">Estoque mínimo</label>
          <input id="edit-estoque-min" aria-label="Estoque mínimo" type="number" step="0.01" value={f.EstoqueMin} onChange={e => upd('EstoqueMin', e.target.value)}/>
        </div>
      </div>
      {!reagente.laboratorioId && (
        <div className="small muted" style={{marginBottom: 8}}>Local anterior: {reagente.local}. Escolha o laboratório para concluir a migração deste reagente.</div>
      )}
      <SeletorLocal idBase="edit-local" value={f.Local} onChange={v => { upd('Local', v); setErroLocal(''); }} erro={erroLocal}/>
      <div className="form-row">
        <div className="field">
          <label htmlFor="edit-validade">Validade</label>
          <input id="edit-validade" aria-label="Data de validade" type="date" value={f.Validade} onChange={e => upd('Validade', e.target.value)}/>
        </div>
      </div>
    </Modal>
  );
}
