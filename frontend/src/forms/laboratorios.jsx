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
  const [f, setF] = useState({ nome: '', sala: '', armarios: [], armarioPendente: '' });
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
        Armarios: comArmarioPendente(f.armarios, f.armarioPendente),
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
    <Modal tutorial="novoLab" title="Novo laboratório" sub="Cadastro de unidade física"
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
      <ListaArmarios id="lab-armarios" armarios={f.armarios} pendente={f.armarioPendente}
        onArmariosChange={v => upd('armarios', v)} onPendenteChange={v => upd('armarioPendente', v)} />
    </Modal>
  );
}

function jaListado(armarios, nome) {
  return armarios.some(armario => armario.toLowerCase() === nome.toLowerCase());
}

function comArmarioPendente(armarios, pendente) {
  const nome = pendente.trim();
  return nome && !jaListado(armarios, nome) ? [...armarios, nome] : armarios;
}

function ListaArmarios({ id, armarios, pendente, onArmariosChange, onPendenteChange }) {
  const [erro, setErro] = useState('');

  const adicionar = () => {
    const nome = pendente.trim();
    if (!nome) return;
    if (jaListado(armarios, nome)) {
      setErro('Esse armário já está na lista.');
      return;
    }
    onArmariosChange([...armarios, nome]);
    onPendenteChange('');
    setErro('');
  };

  const adicionarComEnter = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    adicionar();
  };

  return (
    <div className="form-row full">
      <div className="field"><label htmlFor={id}>Armários</label>
        <div className="armarios-entrada">
          <input id={id} value={pendente} placeholder="ex: Armário A"
            onChange={e => { onPendenteChange(e.target.value); setErro(''); }} onKeyDown={adicionarComEnter} />
          <button type="button" className="btn btn-sm" onClick={adicionar} disabled={!pendente.trim()}>
            <Icon name="plus" size={13} /> Adicionar
          </button>
        </div>
        {erro && <div className="field-error">{erro}</div>}
        {armarios.length === 0
          ? <div className="armarios-vazio">Nenhum armário adicionado.</div>
          : (
            <ul className="armarios-lista" aria-label="Armários adicionados">
              {armarios.map(armario => (
                <li key={armario}>
                  <span>{armario}</span>
                  <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remover ${armario}`}
                    onClick={() => onArmariosChange(armarios.filter(item => item !== armario))}>
                    <Icon name="close" size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
      </div>
    </div>
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
    armarios: lab.armarios,
    armarioPendente: '',
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
        Armarios: comArmarioPendente(f.armarios, f.armarioPendente),
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
      <ListaArmarios id="edit-lab-armarios" armarios={f.armarios} pendente={f.armarioPendente}
        onArmariosChange={v => upd('armarios', v)} onPendenteChange={v => upd('armarioPendente', v)} />
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
