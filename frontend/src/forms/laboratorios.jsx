import { useState } from 'react';
import { Icon } from '../components';
import { LABORATORIOS, REAGENTES, RESIDUOS, AUDITORIA } from '../data';
import { pgrsTs } from '../utils';
import Modal from './Modal';

function reagentesDoLab(labId) {
  return REAGENTES.filter(r => r.local && r.local.startsWith(labId));
}

// ---------- Form: Novo laboratório ----------
export function FormNovoLab({ onClose, dispatch }) {
  const [f, setF] = useState({
    id: '', nome: '', responsavel: 'Profa. Ana Lima',
    bloco: 'Bloco IMC', andar: '2º andar', sala: '',
    capacidade: 30, area_m2: 50,
    ventilacao: 'capela + exaustão',
    armarios: 'Armário Principal',
    cor: '#1465c0',
  });
  const upd = (k, v) => setF(s => ({...s, [k]: v}));

  const submit = () => {
    if (!f.id || !f.nome || !f.sala) { alert('Identificador, nome e sala são obrigatórios.'); return; }
    if (LABORATORIOS.some(l => l.id === f.id)) { alert('Já existe um laboratório com este identificador.'); return; }

    const novo = {
      id: f.id, nome: f.nome, responsavel: f.responsavel,
      sala: `${f.bloco} · ${f.andar} · Sala ${f.sala}`,
      criado: new Date().toISOString().slice(0, 10),
      armarios: f.armarios.split(',').flatMap(s => s.trim() ? [s.trim()] : []),
      capacidade: Number(f.capacidade), area_m2: Number(f.area_m2),
      ventilacao: f.ventilacao, cor: f.cor,
    };
    LABORATORIOS.push(novo);
    AUDITORIA.unshift({
      ts: pgrsTs(),
      who: 'Lucas Souza', what: 'lab.create', where: f.id,
      detail: `Cadastrou laboratório ${f.id} — ${f.nome} (${f.area_m2} m²)`, risk: 'low',
    });
    dispatch({type: 'refresh', flashId: f.id});
    onClose();
  };

  const cores = ['#1465c0', '#0d4a8c', '#1f7a3e', '#b76e00', '#5b3c8c', '#b3261e'];

  return (
    <Modal title="Novo laboratório" sub="Cadastro de unidade física para alocação de reagentes e geração de resíduos"
      onClose={onClose} width={620}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit}>Cadastrar laboratório</button>
      </>}>
      <div className="form-row">
        <div className="field"><label htmlFor="lab-id">Identificador *</label>
          <input id="lab-id" aria-label="Identificador do laboratório" value={f.id} onChange={e => upd('id', e.target.value)} placeholder="Lab-213"/>
        </div>
        <div className="field"><label htmlFor="lab-nome">Nome / área de atuação *</label>
          <input id="lab-nome" aria-label="Nome ou área de atuação do laboratório" value={f.nome} onChange={e => upd('nome', e.target.value)} placeholder="ex: Química Analítica"/>
        </div>
      </div>

      <div className="form-row">
        <div className="field"><label htmlFor="lab-responsavel">Responsável</label>
          <select id="lab-responsavel" value={f.responsavel} onChange={e => upd('responsavel', e.target.value)}>
            <option>Profa. Ana Lima</option>
            <option>Prof. Renan Costa</option>
            <option>Profa. Júlia Reis</option>
            <option>Téc. Carlos Mendes</option>
          </select>
        </div>
        <div className="field"><label htmlFor="lab-cor">Cor identificadora</label>
          <div id="lab-cor" className="lab-cor-swatches">
            {cores.map(c => (
              <button type="button" key={c} onClick={() => upd('cor', c)}
                aria-label={`Selecionar cor ${c}`}
                style={{
                  width: 26, height: 26, borderRadius: 6, background: c,
                  border: f.cor === c ? '2px solid var(--text)' : '1px solid var(--border)',
                  cursor: 'pointer', padding: 0,
                }}/>
            ))}
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="field"><label htmlFor="lab-bloco">Bloco</label>
          <select id="lab-bloco" value={f.bloco} onChange={e => upd('bloco', e.target.value)}>
            <option>Bloco IMC</option>
            <option>Bloco IRN</option>
            <option>Bloco ICE</option>
          </select>
        </div>
        <div className="field"><label htmlFor="lab-andar">Andar</label>
          <select id="lab-andar" value={f.andar} onChange={e => upd('andar', e.target.value)}>
            <option>Térreo</option>
            <option>1º andar</option>
            <option>2º andar</option>
            <option>3º andar</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="field"><label htmlFor="lab-sala">Nº da sala *</label>
          <input id="lab-sala" aria-label="Número da sala" value={f.sala} onChange={e => upd('sala', e.target.value)} placeholder="213"/>
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
          <input id="lab-area" aria-label="Área em m²" type="number" value={f.area_m2} onChange={e => upd('area_m2', e.target.value)}/>
        </div>
        <div className="field"><label htmlFor="lab-capacidade">Capacidade (alunos)</label>
          <input id="lab-capacidade" aria-label="Capacidade em número de alunos" type="number" value={f.capacidade} onChange={e => upd('capacidade', e.target.value)}/>
        </div>
      </div>

      <div className="form-row full">
        <div className="field"><label htmlFor="lab-armarios">Armários (separados por vírgula)</label>
          <input id="lab-armarios" aria-label="Armários separados por vírgula" value={f.armarios} onChange={e => upd('armarios', e.target.value)} placeholder="Armário A, Armário B, Armário Inflamáveis"/>
        </div>
      </div>

      <div className="lab-form-hint">
        <Icon name="warning" size={14}/>
        <span>Após criar, você poderá alocar reagentes a este laboratório a partir da tela de Inventário. Resíduos gerados aqui aparecerão no painel de coleta.</span>
      </div>
    </Modal>
  );
}

// ---------- Confirmar remoção ----------
export function ConfirmRemoverLab({ lab, onClose, dispatch }) {
  const reagentes = reagentesDoLab(lab.id);
  const residuosLab = RESIDUOS.filter(r => r.gerador === lab.id);
  const ativos = residuosLab.filter(r => r.status !== 'destinado').length;
  const temVinculos = reagentes.length > 0 || ativos > 0;

  const [confirmText, setConfirmText] = useState('');
  const exigeConfirmacao = temVinculos;
  const podeRemover = !exigeConfirmacao || confirmText.trim() === lab.id;

  const submit = () => {
    if (!podeRemover) return;
    const idx = LABORATORIOS.findIndex(l => l.id === lab.id);
    if (idx >= 0) LABORATORIOS.splice(idx, 1);
    AUDITORIA.unshift({
      ts: pgrsTs(),
      who: 'Lucas Souza', what: 'lab.remove', where: lab.id,
      detail: `Removeu laboratório ${lab.id} — ${lab.nome}${temVinculos ? ` (com ${reagentes.length} reagentes e ${ativos} resíduos ativos)` : ''}`,
      risk: temVinculos ? 'high' : 'med',
    });
    dispatch({type: 'refresh'});
    onClose();
  };

  return (
    <Modal title={`Remover ${lab.id}?`} sub={`Você está prestes a remover o laboratório "${lab.nome}".`}
      onClose={onClose} width={520}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button
          type="button"
          className="btn btn-sm"
          disabled={!podeRemover}
          onClick={submit}
          style={{
            background: podeRemover ? 'var(--red)' : 'var(--surface-2)',
            color: podeRemover ? '#fff' : 'var(--text-3)',
            borderColor: podeRemover ? 'var(--red)' : 'var(--border)',
            cursor: podeRemover ? 'pointer' : 'not-allowed',
          }}
        >
          <Icon name="trash" size={13}/> Sim, remover laboratório
        </button>
      </>}>
      <div className="lab-remove-header">
        <div className="lab-remove-icon">
          <Icon name="warning" size={20}/>
        </div>
        <div style={{fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)'}}>
          Esta ação é <b style={{color: 'var(--text)'}}>permanente</b> e não pode ser desfeita.
          O laboratório e todos os seus vínculos com reagentes, armários e geração de resíduos serão desassociados.
          Um registro será gravado na trilha de auditoria.
        </div>
      </div>

      <div className="kv" style={{marginBottom: 14, padding: 12, background: 'var(--surface-2)', borderRadius: 'var(--radius)'}}>
        <div className="k">Identificador</div>
        <div className="v mono">{lab.id}</div>
        <div className="k">Nome</div>
        <div className="v">{lab.nome}</div>
        <div className="k">Localização</div>
        <div className="v small">{lab.sala}</div>
        <div className="k">Responsável</div>
        <div className="v">{lab.responsavel}</div>
        <div className="k">Criado em</div>
        <div className="v mono small">{lab.criado}</div>
      </div>

      {temVinculos ? (
        <>
          <div style={{
            padding: 12, background: 'var(--red-soft)', border: '1px solid #efc4c0',
            borderRadius: 'var(--radius)', marginBottom: 12,
          }}>
            <div style={{display: 'flex', gap: 8, marginBottom: 8, color: 'var(--red)', fontWeight: 600, fontSize: 12.5}}>
              <Icon name="warning" size={14}/>
              Este laboratório possui vínculos ativos
            </div>
            <ul style={{margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6}}>
              {reagentes.length > 0 && (
                <li>
                  <b style={{color: 'var(--text)'}}>{reagentes.length} reagente{reagentes.length > 1 ? 's' : ''}</b> alocado{reagentes.length > 1 ? 's' : ''}
                  {': '}{reagentes.slice(0, 3).map(r => r.nome).join(', ')}{reagentes.length > 3 ? `, +${reagentes.length - 3}` : ''}
                </li>
              )}
              {ativos > 0 && (
                <li>
                  <b style={{color: 'var(--text)'}}>{ativos} resíduo{ativos > 1 ? 's' : ''}</b> aguardando coleta ou em rotulagem
                </li>
              )}
              {residuosLab.length > 0 && (
                <li>Histórico de <b style={{color: 'var(--text)'}}>{residuosLab.length}</b> registros de geração permanecerá na auditoria</li>
              )}
            </ul>
          </div>

          <div className="field" style={{marginBottom: 0}}>
            <label htmlFor="lab-confirm-id">Digite <span className="mono" style={{color: 'var(--red)', fontWeight: 600}}>{lab.id}</span> para confirmar</label>
            <input
              id="lab-confirm-id"
              aria-label={`Digite ${lab.id} para confirmar remoção`}
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={lab.id}
              style={{
                borderColor: confirmText && !podeRemover ? 'var(--red)' : undefined,
              }}
            />
          </div>
        </>
      ) : (
        <div className="lab-remove-safe">
          <Icon name="check" size={14}/>
          Nenhum reagente ou resíduo ativo vinculado. Remoção segura.
        </div>
      )}
    </Modal>
  );
}
