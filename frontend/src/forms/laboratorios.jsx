import { useState } from 'react';
import { Icon } from '../components';
import Modal from './Modal';
import { useCriarLaboratorio } from '../laboratorios/useCriarLaboratorio';
import { useAtualizarLaboratorio } from '../laboratorios/useAtualizarLaboratorio';
import { useDeletarLaboratorio } from '../laboratorios/useDeletarLaboratorio';

const CORES = ['#1465c0', '#0d4a8c', '#1f7a3e', '#b76e00', '#5b3c8c', '#b3261e'];

export function FormNovoLab({ onClose, dispatch }) {
  const [f, setF] = useState({
    nome: '', responsavel: '', email: '',
    bloco: 'Bloco IMC', andar: '2º andar', sala: '',
    capacidade: 30, area_m2: 50,
    ventilacao: 'capela + exaustão',
    armarios: 'Armário Principal',
    areas: '',
    cor: '#1465c0',
  });
  const mutation = useCriarLaboratorio();
  const upd = (k, v) => setF(s => ({ ...s, [k]: v }));

  const submit = () => {
    if (!f.nome.trim() || !f.sala.trim()) {
      alert('Nome e número da sala são obrigatórios.');
      return;
    }
    mutation.mutate(
      {
        Nome: f.nome.trim(),
        Responsavel: f.responsavel.trim(),
        Email: f.email.trim() || null,
        Areas: f.areas.split(',').flatMap(s => s.trim() ? [s.trim()] : []),
        Sala: `${f.bloco} · ${f.andar} · Sala ${f.sala.trim()}`,
        Armarios: f.armarios.split(',').flatMap(s => s.trim() ? [s.trim()] : []),
        Capacidade: Number(f.capacidade) || 0,
        AreaM2: Number(f.area_m2) || 0,
        Ventilacao: f.ventilacao,
        Cor: f.cor,
      },
      {
        onSuccess: (lab) => {
          dispatch({ type: 'refresh', flashId: lab.id });
          onClose();
        },
      }
    );
  };

  return (
    <Modal title="Novo laboratório" sub="Cadastro de unidade física"
      onClose={onClose} width={620}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Cadastrando…' : 'Cadastrar laboratório'}
        </button>
      </>}>
      {mutation.isError && <div className="login-err" style={{ marginBottom: 12 }}>{mutation.error.message}</div>}
      <div className="form-row">
        <div className="field"><label htmlFor="lab-nome">Nome / área de atuação *</label>
          <input id="lab-nome" value={f.nome} onChange={e => upd('nome', e.target.value)} placeholder="ex: Química Analítica" />
        </div>
        <div className="field"><label htmlFor="lab-responsavel">Responsável</label>
          <input id="lab-responsavel" value={f.responsavel} onChange={e => upd('responsavel', e.target.value)} placeholder="Profa. Ana Lima" />
        </div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor="lab-email">E-mail do responsável</label>
          <input id="lab-email" type="email" value={f.email} onChange={e => upd('email', e.target.value)} placeholder="ana.lima@instituto.example" />
        </div>
        <div className="field"><label htmlFor="lab-cor">Cor identificadora</label>
          <div id="lab-cor" className="lab-cor-swatches">
            {CORES.map(c => (
              <button type="button" key={c} onClick={() => upd('cor', c)}
                style={{ width: 26, height: 26, borderRadius: 6, background: c, cursor: 'pointer', padding: 0,
                  border: f.cor === c ? '2px solid var(--text)' : '1px solid var(--border)' }} />
            ))}
          </div>
        </div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor="lab-bloco">Bloco</label>
          <select id="lab-bloco" value={f.bloco} onChange={e => upd('bloco', e.target.value)}>
            <option>Bloco IMC</option><option>Bloco IRN</option><option>Bloco ICE</option>
          </select>
        </div>
        <div className="field"><label htmlFor="lab-andar">Andar</label>
          <select id="lab-andar" value={f.andar} onChange={e => upd('andar', e.target.value)}>
            <option>Térreo</option><option>1º andar</option><option>2º andar</option><option>3º andar</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor="lab-sala">Nº da sala *</label>
          <input id="lab-sala" value={f.sala} onChange={e => upd('sala', e.target.value)} placeholder="213" />
        </div>
        <div className="field"><label htmlFor="lab-ventilacao">Ventilação</label>
          <select id="lab-ventilacao" value={f.ventilacao} onChange={e => upd('ventilacao', e.target.value)}>
            <option>capela + exaustão</option>
            <option>capela compartilhada</option>
            <option>capela individual por bancada</option>
            <option>ventilação natural + exaustor</option>
            <option>sala selada + filtro HEPA</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor="lab-area">Área (m²)</label>
          <input id="lab-area" type="number" value={f.area_m2} onChange={e => upd('area_m2', e.target.value)} />
        </div>
        <div className="field"><label htmlFor="lab-capacidade">Capacidade (alunos)</label>
          <input id="lab-capacidade" type="number" value={f.capacidade} onChange={e => upd('capacidade', e.target.value)} />
        </div>
      </div>
      <div className="form-row full">
        <div className="field"><label htmlFor="lab-armarios">Armários (separados por vírgula)</label>
          <input id="lab-armarios" value={f.armarios} onChange={e => upd('armarios', e.target.value)} placeholder="Armário A, Armário B" />
        </div>
      </div>
      <div className="form-row full">
        <div className="field"><label htmlFor="lab-areas">Áreas de armazenamento (separadas por vírgula)</label>
          <input id="lab-areas" value={f.areas} onChange={e => upd('areas', e.target.value)} placeholder="Inflamáveis, Oxidantes, Corrosivos" />
        </div>
      </div>
    </Modal>
  );
}

export function FormEditarLaboratorio({ lab, onClose, dispatch }) {
  const [f, setF] = useState({
    nome: lab.nome,
    responsavel: lab.responsavel,
    email: lab.email ?? '',
    sala: lab.sala,
    capacidade: lab.capacidade,
    area_m2: lab.area_m2,
    ventilacao: lab.ventilacao,
    armarios: lab.armarios.join(', '),
    areas: lab.areas.join(', '),
    cor: lab.cor,
  });
  const mutation = useAtualizarLaboratorio();
  const upd = (k, v) => setF(s => ({ ...s, [k]: v }));

  const submit = () => {
    if (!f.nome.trim()) return;
    mutation.mutate(
      {
        id: lab.id,
        Nome: f.nome.trim(),
        Responsavel: f.responsavel.trim(),
        Email: f.email.trim() || null,
        Areas: f.areas.split(',').flatMap(s => s.trim() ? [s.trim()] : []),
        Sala: f.sala.trim(),
        Armarios: f.armarios.split(',').flatMap(s => s.trim() ? [s.trim()] : []),
        Capacidade: Number(f.capacidade) || 0,
        AreaM2: Number(f.area_m2) || 0,
        Ventilacao: f.ventilacao,
        Cor: f.cor,
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
    <Modal title="Editar laboratório" sub={`${lab.nome} · ${lab.id}`}
      onClose={onClose} width={620}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </>}>
      {mutation.isError && <div className="login-err" style={{ marginBottom: 12 }}>{mutation.error.message}</div>}
      <div className="form-row">
        <div className="field"><label htmlFor="edit-lab-nome">Nome *</label>
          <input id="edit-lab-nome" value={f.nome} onChange={e => upd('nome', e.target.value)} />
        </div>
        <div className="field"><label htmlFor="edit-lab-responsavel">Responsável</label>
          <input id="edit-lab-responsavel" value={f.responsavel} onChange={e => upd('responsavel', e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor="edit-lab-email">E-mail</label>
          <input id="edit-lab-email" type="email" value={f.email} onChange={e => upd('email', e.target.value)} />
        </div>
        <div className="field"><label htmlFor="edit-lab-cor">Cor</label>
          <div className="lab-cor-swatches">
            {CORES.map(c => (
              <button type="button" key={c} onClick={() => upd('cor', c)}
                style={{ width: 26, height: 26, borderRadius: 6, background: c, cursor: 'pointer', padding: 0,
                  border: f.cor === c ? '2px solid var(--text)' : '1px solid var(--border)' }} />
            ))}
          </div>
        </div>
      </div>
      <div className="form-row full">
        <div className="field"><label htmlFor="edit-lab-sala">Localização</label>
          <input id="edit-lab-sala" value={f.sala} onChange={e => upd('sala', e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor="edit-lab-area">Área (m²)</label>
          <input id="edit-lab-area" type="number" value={f.area_m2} onChange={e => upd('area_m2', e.target.value)} />
        </div>
        <div className="field"><label htmlFor="edit-lab-capacidade">Capacidade</label>
          <input id="edit-lab-capacidade" type="number" value={f.capacidade} onChange={e => upd('capacidade', e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor="edit-lab-ventilacao">Ventilação</label>
          <select id="edit-lab-ventilacao" value={f.ventilacao} onChange={e => upd('ventilacao', e.target.value)}>
            <option>capela + exaustão</option>
            <option>capela compartilhada</option>
            <option>capela individual por bancada</option>
            <option>ventilação natural + exaustor</option>
            <option>sala selada + filtro HEPA</option>
          </select>
        </div>
      </div>
      <div className="form-row full">
        <div className="field"><label htmlFor="edit-lab-armarios">Armários</label>
          <input id="edit-lab-armarios" value={f.armarios} onChange={e => upd('armarios', e.target.value)} />
        </div>
      </div>
      <div className="form-row full">
        <div className="field"><label htmlFor="edit-lab-areas">Áreas de armazenamento</label>
          <input id="edit-lab-areas" value={f.areas} onChange={e => upd('areas', e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

export function ConfirmRemoverLab({ lab, onClose, dispatch }) {
  const [confirmText, setConfirmText] = useState('');
  const mutation = useDeletarLaboratorio();
  const podeRemover = confirmText.trim() === lab.id;

  const submit = () => {
    if (!podeRemover) return;
    mutation.mutate(lab.id, {
      onSuccess: () => {
        dispatch({ type: 'refresh' });
        onClose();
      },
    });
  };

  return (
    <Modal title={`Remover ${lab.id}?`} sub={`Você está prestes a remover o laboratório "${lab.nome}".`}
      onClose={onClose} width={480}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-sm" disabled={!podeRemover || mutation.isPending}
          onClick={submit}
          style={{
            background: podeRemover ? 'var(--red)' : 'var(--surface-2)',
            color: podeRemover ? '#fff' : 'var(--text-3)',
            borderColor: podeRemover ? 'var(--red)' : 'var(--border)',
          }}>
          <Icon name="trash" size={13} /> {mutation.isPending ? 'Removendo…' : 'Sim, remover'}
        </button>
      </>}>
      {mutation.isError && <div className="login-err" style={{ marginBottom: 12 }}>{mutation.error.message}</div>}
      <div className="kv" style={{ marginBottom: 14, padding: 12, background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}>
        <div className="k">Identificador</div><div className="v mono">{lab.id}</div>
        <div className="k">Nome</div><div className="v">{lab.nome}</div>
        <div className="k">Localização</div><div className="v small">{lab.sala}</div>
        <div className="k">Responsável</div><div className="v">{lab.responsavel}</div>
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor="lab-confirm-id">
          Digite <span className="mono" style={{ color: 'var(--red)', fontWeight: 600 }}>{lab.id}</span> para confirmar
        </label>
        <input id="lab-confirm-id" value={confirmText} onChange={e => setConfirmText(e.target.value)}
          placeholder={lab.id} style={{ borderColor: confirmText && !podeRemover ? 'var(--red)' : undefined }} />
      </div>
    </Modal>
  );
}
