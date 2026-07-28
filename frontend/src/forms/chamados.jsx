import { useState } from 'react';
import { Icon } from '../components';
import Modal from './Modal';
import { useCriarChamado } from '../chamados/useCriarChamado';
import { useLaboratorios } from '../laboratorios/useLaboratorios';

const TIPOS = [
  ['bug', '🐛 Bug'],
  ['feature', '💡 Sugestão'],
  ['ui', '🎨 Interface'],
  ['performance', '⚡ Performance'],
  ['conformidade', '📋 Conformidade'],
  ['outro', 'Outro'],
];

const SEVERIDADES = [
  ['baixa', 'Baixa'],
  ['media', 'Média'],
  ['alta', 'Alta'],
  ['critica', 'Crítica'],
];

export function FormNovoChamado({ onClose, dispatch }) {
  const [f, setF] = useState({ titulo: '', descricao: '', tipo: 'bug', severidade: 'media', laboratorioId: '' });
  const mutation = useCriarChamado();
  const { data: labs = [] } = useLaboratorios();
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));

  const submit = () => {
    if (!f.titulo.trim() || !f.descricao.trim()) {
      alert('Título e descrição são obrigatórios.');
      return;
    }
    mutation.mutate(
      {
        Titulo: f.titulo.trim(),
        Descricao: f.descricao.trim(),
        LaboratorioId: f.laboratorioId || null,
        Tipo: f.tipo.charAt(0).toUpperCase() + f.tipo.slice(1),
        Severidade: f.severidade.charAt(0).toUpperCase() + f.severidade.slice(1),
      },
      { onSuccess: () => { dispatch({ type: 'refresh' }); onClose(); } }
    );
  };

  return (
    <Modal title="Novo chamado" sub="Registrar problema, sugestão ou melhoria"
      onClose={onClose} width={560}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Enviando…' : 'Abrir chamado'}
        </button>
      </>}>
      {mutation.isError && <div className="login-err" style={{ marginBottom: 12 }}>{mutation.error.message}</div>}
      <div className="field">
        <label htmlFor="ch-titulo">Título</label>
        <input id="ch-titulo" value={f.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Resumo em uma linha" />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="ch-tipo">Tipo</label>
          <select id="ch-tipo" value={f.tipo} onChange={e => set('tipo', e.target.value)}>
            {TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ch-sev">Severidade</label>
          <select id="ch-sev" value={f.severidade} onChange={e => set('severidade', e.target.value)}>
            {SEVERIDADES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="ch-lab">Laboratório</label>
        <select id="ch-lab" value={f.laboratorioId} onChange={e => set('laboratorioId', e.target.value)}>
          <option value="">Selecionar…</option>
          {labs.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="ch-desc">Descrição</label>
        <textarea id="ch-desc" rows={4} value={f.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Descreva o problema ou sugestão com detalhes" />
      </div>
    </Modal>
  );
}
