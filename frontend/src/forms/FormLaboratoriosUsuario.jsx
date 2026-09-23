import { useState } from 'react';
import Modal from './Modal';
import { useLaboratorios } from '../laboratorios/useLaboratorios';
import { useLaboratoriosDoUsuario } from '../laboratorios/useLaboratoriosDoUsuario';
import { useDefinirLaboratorios } from '../usuarios/useDefinirLaboratorios';
import { useToast } from '../components/ToastContext';

export function SeletorLaboratorios({ id, value, onChange }) {
  const { laboratorios } = useLaboratoriosDoUsuario();
  const alternar = (labId) =>
    onChange(value.includes(labId) ? value.filter(x => x !== labId) : [...value, labId]);

  if (laboratorios.length === 0) {
    return <div className="small muted">Você não responde por nenhum laboratório para atribuir.</div>;
  }
  return (
    <div className="lab-chip-grid" role="group" aria-labelledby={id}>
      {laboratorios.map(lab => (
        <label key={lab.id} className={`lab-chip${value.includes(lab.id) ? ' sel' : ''}`}>
          <input type="checkbox" checked={value.includes(lab.id)} onChange={() => alternar(lab.id)} />
          <span className="lab-color" style={{ background: lab.cor || 'var(--border)' }} />
          <span>{lab.nome}</span>
        </label>
      ))}
    </div>
  );
}

export default function FormLaboratoriosUsuario({ onClose, usuario }) {
  const { data: todos = [] } = useLaboratorios();
  const { respondePor } = useLaboratoriosDoUsuario();
  const definir = useDefinirLaboratorios();
  const { addToast } = useToast();
  const [selecionados, setSelecionados] = useState(() => usuario?.laboratorioIds ?? []);

  const preservados = todos.filter(l => !respondePor(l.id) && selecionados.includes(l.id));

  const salvar = () =>
    definir.mutate(
      { id: usuario.id, laboratorioIds: selecionados.filter(respondePor) },
      {
        onSuccess: () => {
          addToast(`Laboratórios de ${usuario.nome} atualizados.`, 'success');
          onClose();
        },
      }
    );

  return (
    <Modal title="Laboratórios" sub={`Por quais laboratórios ${usuario?.nome} responde`}
      onClose={onClose} width={560}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={salvar} disabled={definir.isPending}>
          {definir.isPending ? 'Salvando…' : 'Salvar'}
        </button>
      </>}>
      <SeletorLaboratorios id="labs-usuario" value={selecionados} onChange={setSelecionados} />
      {preservados.length > 0 && (
        <>
          <div className="small muted" style={{ margin: '12px 0 6px' }}>
            Preservados — respondem por eles outros professores, e salvar não os remove:
          </div>
          <div className="lab-chip-grid">
            {preservados.map(lab => (
              <span key={lab.id} className="lab-chip sel forced">
                <span className="lab-color" style={{ background: lab.cor || 'var(--border)' }} />
                <span>{lab.nome}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
