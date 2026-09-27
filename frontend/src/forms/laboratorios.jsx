import { useState } from 'react';
import { Icon } from '../components';
import Modal from './Modal';
import { useCriarLaboratorio } from '../laboratorios/useCriarLaboratorio';
import { useAtualizarLaboratorio } from '../laboratorios/useAtualizarLaboratorio';
import { useDeletarLaboratorio } from '../laboratorios/useDeletarLaboratorio';
import { useLaboratorios } from '../laboratorios/useLaboratorios';
import { useAuth } from '../auth/AuthContext';

const CORES = ['#1465c0', '#0d4a8c', '#1f7a3e', '#b76e00', '#5b3c8c', '#b3261e'];

export function FormNovoLab({ onClose, dispatch }) {
  const [f, setF] = useState({ nome: '', sala: '', armarios: '' });
  const [erro, setErro] = useState('');
  const mutation = useCriarLaboratorio();
  const { data: labs = [] } = useLaboratorios();
  const { user, updateUser } = useAuth();
  const upd = (k, v) => setF(s => ({ ...s, [k]: v }));

  const submit = () => {
    if (!f.nome.trim() || !f.sala.trim()) {
      setErro('Nome e localização são obrigatórios.');
      return;
    }
    setErro('');
    mutation.mutate(
      {
        Nome: f.nome.trim(),
        Responsavel: user?.nome || user?.email || '',
        Sala: f.sala.trim(),
        Armarios: f.armarios.split(',').flatMap(s => s.trim() ? [s.trim()] : []),
        Cor: corMenosUsada(labs),
      },
      {
        onSuccess: (lab) => {
          if (user && user.papel !== 'Admin') {
            updateUser({ ...user, laboratorioIds: [...(user.laboratorioIds ?? []), lab.id] });
          }
          dispatch({ type: 'refresh', flashId: lab.id });
          onClose();
        },
      }
    );
  };

  return (
    <Modal title="Novo laboratório" sub="Cadastro de unidade física"
      onClose={onClose} width={520}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Cadastrando…' : 'Cadastrar laboratório'}
        </button>
      </>}>
      {erro && <div className="login-err" style={{ marginBottom: 12 }}>{erro}</div>}
      {mutation.isError && <div className="login-err" style={{ marginBottom: 12 }}>{mutation.error.message}</div>}
      <div className="form-row full">
        <div className="field"><label htmlFor="lab-nome">Nome / área de atuação *</label>
          <input id="lab-nome" value={f.nome} onChange={e => upd('nome', e.target.value)} placeholder="ex: Química Analítica" />
        </div>
      </div>
      <div className="form-row full">
        <div className="field"><label htmlFor="lab-sala">Localização *</label>
          <input id="lab-sala" value={f.sala} onChange={e => upd('sala', e.target.value)} placeholder="ex: Bloco IMC · Sala 213" />
        </div>
      </div>
      <div className="form-row full">
        <div className="field"><label htmlFor="lab-armarios">Armários (separados por vírgula)</label>
          <input id="lab-armarios" value={f.armarios} onChange={e => upd('armarios', e.target.value)} placeholder="Armário A, Armário B" />
        </div>
      </div>
    </Modal>
  );
}

function corMenosUsada(labs) {
  const usos = new Map(CORES.map(cor => [cor, 0]));
  labs.forEach(lab => { if (usos.has(lab.cor)) usos.set(lab.cor, usos.get(lab.cor) + 1); });
  return CORES.reduce((menos, cor) => (usos.get(cor) < usos.get(menos) ? cor : menos));
}

export function FormEditarLaboratorio({ lab, onClose, dispatch }) {
  const [f, setF] = useState({
    nome: lab.nome,
    sala: lab.sala,
    armarios: lab.armarios.join(', '),
  });
  const mutation = useAtualizarLaboratorio();
  const upd = (k, v) => setF(s => ({ ...s, [k]: v }));

  const submit = () => {
    if (!f.nome.trim()) return;
    mutation.mutate(
      {
        id: lab.id,
        Nome: f.nome.trim(),
        Sala: f.sala.trim(),
        Armarios: f.armarios.split(',').flatMap(s => s.trim() ? [s.trim()] : []),
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
      onClose={onClose} width={520}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </>}>
      {mutation.isError && <div className="login-err" style={{ marginBottom: 12 }}>{mutation.error.message}</div>}
      <div className="form-row full">
        <div className="field"><label htmlFor="edit-lab-nome">Nome *</label>
          <input id="edit-lab-nome" value={f.nome} onChange={e => upd('nome', e.target.value)} />
        </div>
      </div>
      <div className="form-row full">
        <div className="field"><label htmlFor="edit-lab-sala">Localização</label>
          <input id="edit-lab-sala" value={f.sala} onChange={e => upd('sala', e.target.value)} />
        </div>
      </div>
      <div className="form-row full">
        <div className="field"><label htmlFor="edit-lab-armarios">Armários (separados por vírgula)</label>
          <input id="edit-lab-armarios" value={f.armarios} onChange={e => upd('armarios', e.target.value)} />
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
