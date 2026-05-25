import { useState } from 'react';
import { Icon, Badge, Tag, SectionTitle, validadeBadge } from '../components';
import { REAGENTES, LABORATORIOS, RESIDUOS, REATIVIDADE_CLASSES, PICTOS_GHS } from '../data';
import { exportCsv, logAudit } from '../utils';

function reagentesDoLab(labId) {
  return REAGENTES.filter(r => r.local && r.local.startsWith(labId));
}

function volumeDoLab(labId) {
  const list = reagentesDoLab(labId);
  let L = 0, kg = 0;
  list.forEach(r => {
    if (r.unidade === 'L' || r.unidade === 'mL') L += r.unidade === 'mL' ? r.estoque / 1000 : r.estoque;
    if (r.unidade === 'kg' || r.unidade === 'g') kg += r.unidade === 'g' ? r.estoque / 1000 : r.estoque;
  });
  return { L, kg };
}

function LabCard({ lab, expanded, onToggle, onRemove, dispatch, flash }) {
  const reagentes = reagentesDoLab(lab.id);
  const { L, kg } = volumeDoLab(lab.id);
  const expirando = reagentes.filter(r => r.validade_status === 'expira-breve').length;
  const controlados = reagentes.filter(r => r.controlado).length;

  // sumário de classes presentes no lab
  const classesPresentes = [...new Set(reagentes.map(r => r.classe))].toSorted((a, b) => a - b);

  return (
    <div className={`card lab-card ${flash ? 'flash' : ''}`}>
      <div className="lab-card-h" style={{borderLeft: `3px solid ${lab.cor}`}}>
        <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10}}>
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2}}>
              <span className="mono" style={{fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.04em'}}>{lab.id}</span>
              {controlados > 0 && <Badge kind="purple" dot>{controlados} controlados</Badge>}
              {expirando > 0 && <Badge kind="amber" dot>{expirando} expirando</Badge>}
            </div>
            <h3 style={{fontSize: 15, fontWeight: 600, margin: 0, marginBottom: 4}}>{lab.nome}</h3>
            <div className="small muted" style={{display: 'flex', alignItems: 'center', gap: 4}}>
              <Icon name="location" size={11}/> {lab.sala}
            </div>
          </div>
          <div style={{display: 'flex', gap: 4, flexShrink: 0}}>
            <button type="button" className="btn btn-ghost btn-sm" title="Remover laboratório" onClick={onRemove}>
              <Icon name="trash" size={13}/>
            </button>
          </div>
        </div>

        <div className="lab-stats">
          <div className="lab-stat">
            <div className="lab-stat-val tnum">{reagentes.length}</div>
            <div className="lab-stat-lbl">reagentes</div>
          </div>
          <div className="lab-stat">
            <div className="lab-stat-val tnum">{L.toFixed(1)}<span className="unit">L</span></div>
            <div className="lab-stat-lbl">líquidos</div>
          </div>
          <div className="lab-stat">
            <div className="lab-stat-val tnum">{kg.toFixed(2)}<span className="unit">kg</span></div>
            <div className="lab-stat-lbl">sólidos</div>
          </div>
          <div className="lab-stat">
            <div className="lab-stat-val tnum">{lab.armarios.length}</div>
            <div className="lab-stat-lbl">armários</div>
          </div>
        </div>

        <div style={{display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8}}>
          <Tag>resp. {lab.responsavel.split(' ').slice(-2).join(' ')}</Tag>
          <Tag>{lab.area_m2} m²</Tag>
          <Tag>cap. {lab.capacidade}</Tag>
          {lab.armarios.map(a => <Tag key={a}>{a}</Tag>)}
        </div>
      </div>

      {/* Lista compacta de reagentes */}
      {reagentes.length > 0 ? (
        <div className="lab-reag-list">
          <div className="lab-reag-head">
            <span>Reagentes alocados</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onToggle}>
              {expanded ? 'Recolher' : `Ver todos (${reagentes.length})`}
              <Icon name={expanded ? 'chevron_down' : 'chevron_right'} size={11}/>
            </button>
          </div>
          <table className="tbl lab-reag-tbl">
            <tbody>
              {(expanded ? reagentes : reagentes.slice(0, 3)).map(r => (
                <tr key={r.id} onClick={() => dispatch({type: 'detail', id: r.id})}>
                  <td style={{width: 24, paddingRight: 0}}>
                    <div style={{display: 'flex', gap: 1}}>
                      {r.pictos.slice(0, 2).map((p, i) => (
                        <span key={i} title={PICTOS_GHS[p]?.label}
                          style={{width: 10, height: 10, border: '1.2px solid var(--red)', transform: 'rotate(45deg)', display: 'inline-block'}}/>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{fontWeight: 500, fontSize: 12}}>{r.nome}</div>
                    <div className="mono small muted" style={{fontSize: 12}}>{r.id} · {r.cas}</div>
                  </td>
                  <td className="small muted" style={{fontSize: 12}}>
                    {r.local.split('·').slice(1).join('·').trim() || '-'}
                  </td>
                  <td className="num right" style={{fontSize: 12, color: r.estoque_min && r.estoque < r.estoque_min ? 'var(--red)' : 'inherit', fontWeight: r.estoque_min && r.estoque < r.estoque_min ? 600 : 400}}>
                    {r.estoque.toFixed(1)} {r.unidade}
                  </td>
                  <td style={{width: 1, whiteSpace: 'nowrap'}}>{validadeBadge(r.validade_status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {classesPresentes.length > 0 && (
            <div className="lab-classes">
              <span className="mono small muted" style={{textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 12}}>Classes presentes:</span>
              {classesPresentes.map(c => (
                <span key={c} className="lab-class-pill" title={REATIVIDADE_CLASSES[c]}>
                  {c}. {REATIVIDADE_CLASSES[c]}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="empty" style={{padding: '18px 14px', fontSize: 12}}>
          Nenhum reagente alocado neste laboratório.
        </div>
      )}
    </div>
  );
}

export function LaboratoriosScreen({ state, dispatch }) {
  const [expandedId, setExpandedId] = useState(null);
  const labs = LABORATORIOS;
  const totalReag = REAGENTES.length;
  const totalArmarios = labs.reduce((s, l) => s + l.armarios.length, 0);
  const totalArea = labs.reduce((s, l) => s + l.area_m2, 0);
  const totalVol = labs.reduce((s, l) => {
    const v = volumeDoLab(l.id);
    return { L: s.L + v.L, kg: s.kg + v.kg };
  }, { L: 0, kg: 0 });

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Laboratórios</h1>
          <p className="page-sub">{labs.length} laboratórios cadastrados · {totalReag} reagentes alocados · base regulatória NR-10/NR-26</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-sm" onClick={() => {
            const rows = [['Lab', 'Nome', 'Responsável', 'Sala', 'Capacidade', 'Área (m²)', 'Armários', 'Reagentes alocados']];
            LABORATORIOS.forEach(l => {
              const reags = REAGENTES.filter(r => r.local && r.local.startsWith(l.id)).length;
              rows.push([l.id, l.nome, l.responsavel, l.sala, l.capacidade, l.area_m2, (l.armarios || []).join(';'), reags]);
            });
            exportCsv(rows, `planta-laboratorios-${new Date().toISOString().slice(0,10)}.csv`);
            logAudit('lab.planta.export', `Exportou planta dos laboratórios (${LABORATORIOS.length} labs)`);
            dispatch({type: 'refresh'});
          }}><Icon name="download" size={13}/> Exportar planta</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => dispatch({type: 'openModal', kind: 'novoLab'})}>
            <Icon name="plus" size={13}/> Novo laboratório
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-stripe"/>
          <div className="label">Laboratórios ativos</div>
          <div className="value tnum">{labs.length}<span className="unit">salas</span></div>
          <div className="delta">{totalArea} m² · {totalArmarios} armários</div>
        </div>
        <div className="kpi ok">
          <div className="kpi-stripe"/>
          <div className="label">Reagentes alocados</div>
          <div className="value tnum">{totalReag}<span className="unit">itens</span></div>
          <div className="delta">100% rastreados</div>
        </div>
        <div className="kpi">
          <div className="kpi-stripe"/>
          <div className="label">Estoque líquido</div>
          <div className="value tnum">{totalVol.L.toFixed(1)}<span className="unit">L</span></div>
          <div className="delta">+ {totalVol.kg.toFixed(2)} kg sólidos</div>
        </div>
        <div className="kpi warn">
          <div className="kpi-stripe"/>
          <div className="label">Lotação média</div>
          <div className="value tnum">{Math.round(labs.reduce((s, l) => s + l.capacidade, 0) / labs.length)}<span className="unit">alunos</span></div>
          <div className="delta">capacidade combinada {labs.reduce((s, l) => s + l.capacidade, 0)}</div>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14}}>
        {labs.map(lab => (
          <LabCard
            key={lab.id}
            lab={lab}
            expanded={expandedId === lab.id}
            onToggle={() => setExpandedId(expandedId === lab.id ? null : lab.id)}
            onRemove={() => dispatch({type: 'openModal', kind: 'removerLab', lab})}
            dispatch={dispatch}
            flash={state.flashId === lab.id}
          />
        ))}

        {labs.length === 0 && (
          <div className="card" style={{gridColumn: '1 / -1'}}>
            <div className="empty">
              <div style={{fontSize: 14, marginBottom: 6, color: 'var(--text-2)'}}>Nenhum laboratório cadastrado.</div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => dispatch({type: 'openModal', kind: 'novoLab'})}>
                <Icon name="plus" size={13}/> Cadastrar primeiro laboratório
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
