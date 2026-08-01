import { useState } from 'react';
import { Icon, Badge, Tag, SectionTitle } from '../components';
import { REATIVIDADE_CLASSES } from '../data';
import { exportCsv } from '../utils';
import { useLaboratorios } from '../laboratorios/useLaboratorios';
import { usePode } from '../auth/permissoes';

function LabCard({ lab, onRemove, onEdit, dispatch, flash, podeEditar, podeRemover }) {
  return (
    <div className={`card lab-card ${flash ? 'flash' : ''}`}>
      <div className="lab-card-h" style={{ borderLeft: `3px solid ${lab.cor}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span className="mono" style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.04em' }}>{lab.id}</span>
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, marginBottom: 4 }}>{lab.nome}</h3>
            <div className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="location" size={11} /> {lab.sala}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {podeEditar && (
              <button type="button" className="btn btn-ghost btn-sm" title="Editar laboratório" onClick={onEdit}>
                <Icon name="edit" size={13} />
              </button>
            )}
            {podeRemover && (
              <button type="button" className="btn btn-ghost btn-sm" title="Remover laboratório" onClick={onRemove}>
                <Icon name="trash" size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="lab-stats">
          <div className="lab-stat">
            <div className="lab-stat-val tnum">{lab.armarios.length}</div>
            <div className="lab-stat-lbl">armários</div>
          </div>
          <div className="lab-stat">
            <div className="lab-stat-val tnum">{lab.area_m2}<span className="unit">m²</span></div>
            <div className="lab-stat-lbl">área</div>
          </div>
          <div className="lab-stat">
            <div className="lab-stat-val tnum">{lab.capacidade}</div>
            <div className="lab-stat-lbl">cap. alunos</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          <Tag>resp. {lab.responsavel.split(' ').slice(-2).join(' ')}</Tag>
          <Tag>{lab.ventilacao}</Tag>
          {lab.armarios.map(a => <Tag key={a}>{a}</Tag>)}
        </div>
      </div>

      {lab.areas.length > 0 && (
        <div className="lab-reag-list">
          <div className="lab-reag-head"><span>Áreas de armazenamento</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 14px' }}>
            {lab.areas.map(a => <Tag key={a}>{a}</Tag>)}
          </div>
        </div>
      )}
    </div>
  );
}

export function LaboratoriosScreen({ state, dispatch }) {
  const { data: labs = [], isPending, isError, refetch } = useLaboratorios();
  const podeGerir = usePode('Gestor');   // POST/PUT /api/laboratorios
  const podeRemover = usePode('Admin');  // DELETE /api/laboratorios/:id

  const totalArmarios = labs.reduce((s, l) => s + l.armarios.length, 0);
  const totalArea = labs.reduce((s, l) => s + l.area_m2, 0);
  const totalCap = labs.reduce((s, l) => s + l.capacidade, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Laboratórios</h1>
          <p className="page-sub">{labs.length} laboratórios cadastrados · base regulatória NR-10/NR-26</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-sm" onClick={() => {
            const rows = [['Lab', 'Nome', 'Responsável', 'Sala', 'Capacidade', 'Área (m²)', 'Armários']];
            labs.forEach(l => rows.push([l.id, l.nome, l.responsavel, l.sala, l.capacidade, l.area_m2, l.armarios.join(';')]));
            exportCsv(rows, `planta-laboratorios-${new Date().toISOString().slice(0, 10)}.csv`);
          }}><Icon name="download" size={13} /> Exportar planta</button>
          {podeGerir && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => dispatch({ type: 'openModal', kind: 'novoLab' })}>
              <Icon name="plus" size={13} /> Novo laboratório
            </button>
          )}
        </div>
      </div>

      {isPending && <div className="page-loading"><Icon name="refresh" size={16} /> Carregando...</div>}
      {isError && (
        <div className="page-error">
          Erro ao carregar laboratórios. <button onClick={refetch}>Tentar novamente</button>
        </div>
      )}

      {!isPending && !isError && (
        <>
          <div className="kpi-grid">
            <div className="kpi">
              <div className="kpi-stripe" />
              <div className="label">Laboratórios ativos</div>
              <div className="value tnum">{labs.length}<span className="unit">salas</span></div>
              <div className="delta">{totalArea.toFixed(1)} m² · {totalArmarios} armários</div>
            </div>
            <div className="kpi">
              <div className="kpi-stripe" />
              <div className="label">Capacidade combinada</div>
              <div className="value tnum">{totalCap}<span className="unit">alunos</span></div>
              <div className="delta">média {labs.length ? Math.round(totalCap / labs.length) : 0} por sala</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {labs.map(lab => (
              <LabCard
                key={lab.id}
                lab={lab}
                onRemove={() => dispatch({ type: 'openModal', kind: 'removerLab', lab })}
                onEdit={() => dispatch({ type: 'openModal', kind: 'editarLab', lab })}
                podeEditar={podeGerir}
                podeRemover={podeRemover}
                dispatch={dispatch}
                flash={state.flashId === lab.id}
              />
            ))}
            {labs.length === 0 && (
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <div className="empty">
                  <div style={{ fontSize: 14, marginBottom: 6, color: 'var(--text-2)' }}>Nenhum laboratório cadastrado.</div>
                  {podeGerir && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => dispatch({ type: 'openModal', kind: 'novoLab' })}>
                      <Icon name="plus" size={13} /> Cadastrar primeiro laboratório
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
