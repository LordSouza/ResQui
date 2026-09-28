import { useLaboratoriosDoUsuario } from '../laboratorios/useLaboratoriosDoUsuario';

export const LOCAL_VAZIO = { laboratorioId: '', armario: '' };

export function SeletorLocal({ idBase, value, onChange, erro }) {
  const { laboratorios, isPending, isError } = useLaboratoriosDoUsuario();
  const laboratorio = laboratorios.find(l => l.id === value.laboratorioId);
  const armarios = laboratorio?.armarios ?? [];
  const opcoesDeArmario = value.armario && !armarios.includes(value.armario) ? [value.armario, ...armarios] : armarios;

  const escolherLaboratorio = (laboratorioId) => {
    const escolhido = laboratorios.find(l => l.id === laboratorioId);
    const unico = escolhido?.armarios?.length === 1 ? escolhido.armarios[0] : '';
    onChange({ laboratorioId, armario: unico });
  };

  return (
    <div className="form-row">
      <div className="field"><label htmlFor={`${idBase}-laboratorio`}>Laboratório</label>
        <select id={`${idBase}-laboratorio`} value={value.laboratorioId} onChange={e => escolherLaboratorio(e.target.value)} disabled={isPending}>
          <option value="">{isPending ? 'Carregando…' : isError ? 'Erro ao carregar' : 'Selecione…'}</option>
          {laboratorios.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
        {erro && <div className="field-error">{erro}</div>}
      </div>
      <div className="field"><label htmlFor={`${idBase}-armario`}>Armário</label>
        <select id={`${idBase}-armario`} value={value.armario} onChange={e => onChange({ ...value, armario: e.target.value })}
          disabled={!laboratorio || opcoesDeArmario.length === 0}>
          <option value="">{!laboratorio ? 'Escolha o laboratório' : opcoesDeArmario.length === 0 ? 'Sem armários' : 'Selecione…'}</option>
          {opcoesDeArmario.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
    </div>
  );
}

export function erroDoLocal(local) {
  return local.laboratorioId ? '' : 'Escolha o laboratório.';
}
