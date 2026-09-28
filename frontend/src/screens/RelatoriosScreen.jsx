import { Icon, Badge, SectionTitle, Empty } from '../components';
import { useToast } from '../components/ToastContext';
import { useRelatorios } from '../relatorios/useRelatorios';
import { useGerarRelatorio } from '../relatorios/useGerarRelatorio';
import { downloadRelatorio } from '../relatorios/downloadRelatorio';
import { useState } from 'react';
import { usePode } from '../auth/permissoes';
import { useLaboratoriosDoUsuario } from '../laboratorios/useLaboratoriosDoUsuario';

const TIPOS = [
  { slug: 'pgrs',           titulo: 'PGRS Anual',                  desc: 'Exportação completa do PGRS (todos os tipos)' },
  { slug: 'inventario',     titulo: 'Inventário de reagentes',      desc: 'Listagem completa com estoque, validade e classe' },
  { slug: 'mapa-risco',     titulo: 'Mapa de risco químico',        desc: 'Por classe e sinal GHS' },
  { slug: 'residuos-ibama', titulo: 'Resíduos por código IBAMA',    desc: 'Agregados com número de MTR vinculado' },
  { slug: 'indicadores',    titulo: 'Indicadores de geração',       desc: 'Volume (L) por mês e por laboratório' },
];

function descreverRecorte(laboratorioIds, nomePorLaboratorio, geraInstitucional) {
  if (!laboratorioIds) return geraInstitucional ? 'Institucional' : 'Seus laboratórios';
  const nomes = laboratorioIds.filter(id => nomePorLaboratorio[id]).map(id => nomePorLaboratorio[id]);
  const deOutros = laboratorioIds.length - nomes.length;
  const outros = deOutros === 0 ? [] : [deOutros === 1 ? '1 outro laboratório' : `${deOutros} outros laboratórios`];
  return [...nomes, ...outros].join(', ');
}

export function RelatoriosScreen({ state, dispatch }) {
  const { data: historico = [], isPending, isError, refetch } = useRelatorios();
  const gerar = useGerarRelatorio();
  const { addToast } = useToast();
  // PUT /api/pgrs-config exige Administracao; POST /api/relatorios/gerar, Cadastro.
  const podeConfigurar = usePode('Administracao');
  const podeGerar = usePode('Cadastro');
  const geraInstitucional = usePode('Administracao');
  const { laboratorios } = useLaboratoriosDoUsuario();
  const nomePorLaboratorio = Object.fromEntries(laboratorios.map(l => [l.id, l.nome]));
  const [laboratorioEscolhido, setLaboratorioEscolhido] = useState('');

  async function handleGerar(slug) {
    try {
      const novo = await gerar.mutateAsync({
        Tipo: slug,
        ...(laboratorioEscolhido && { LaboratorioIds: [laboratorioEscolhido] }),
      });
      await downloadRelatorio(novo.id, novo.titulo);
    } catch (e) {
      addToast(e.message, 'error');
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatórios e PGRS</h1>
          <p className="page-sub">
            Plano de Gerenciamento de Resíduos Sólidos · {geraInstitucional
              ? 'documentos consolidados da instituição para órgãos fiscalizadores'
              : 'documentos com os dados dos laboratórios pelos quais você responde'}
          </p>
        </div>
        {(podeGerar || podeConfigurar) && (
          <div className="page-actions">
            {podeGerar && (
              <select aria-label="Recorte do relatório" value={laboratorioEscolhido} onChange={e => setLaboratorioEscolhido(e.target.value)}>
                <option value="">{geraInstitucional ? 'Institucional (todos os laboratórios)' : 'Todos os meus laboratórios'}</option>
                {laboratorios.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            )}
            {podeConfigurar && (
            <button type="button" className="btn btn-sm" onClick={() => dispatch({ type: 'openModal', kind: 'configurarPgrs' })}>
              <Icon name="settings" size={12} /> Configurar PGRS
            </button>
            )}
          </div>
        )}
      </div>

      <div className="grid-3" style={{ marginBottom: 16 }}>
        {TIPOS.map(({ slug, titulo, desc }) => (
          <div className="card" key={slug}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <Icon name="file_chart" size={20} />
                <Badge kind="blue">CSV</Badge>
              </div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{titulo}</div>
              <div className="small muted" style={{ marginBottom: 10 }}>{desc}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
                {podeGerar && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={gerar.isPending}
                    onClick={() => handleGerar(slug)}
                  >
                    <Icon name="download" size={11} /> {gerar.isPending ? 'Gerando…' : 'Gerar'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <SectionTitle
          title="Histórico de relatórios gerados"
          sub={geraInstitucional ? 'Últimos relatórios gerados pela equipe' : 'Relatórios que você gerou'}
        />
        {isPending && (
          <div className="page-loading"><Icon name="refresh" size={16} /> Carregando...</div>
        )}
        {isError && (
          <div className="page-error">
            Erro ao carregar histórico.{' '}
            <button onClick={refetch}>Tentar novamente</button>
          </div>
        )}
        {!isPending && !isError && historico.length === 0 && (
          <Empty>Nenhum relatório gerado ainda.</Empty>
        )}
        {historico.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '8px 14px', textAlign: 'left' }}>Título</th>
                <th style={{ padding: '8px 14px', textAlign: 'left' }}>Tipo</th>
                <th style={{ padding: '8px 14px', textAlign: 'left' }}>Recorte</th>
                <th style={{ padding: '8px 14px', textAlign: 'right' }}>Linhas</th>
                <th style={{ padding: '8px 14px', textAlign: 'left' }}>Gerado em</th>
                <th style={{ padding: '8px 14px' }} />
              </tr>
            </thead>
            <tbody>
              {historico.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 14px' }}>{r.titulo}</td>
                  <td style={{ padding: '8px 14px' }}><Badge kind="blue">{r.tipo}</Badge></td>
                  <td style={{ padding: '8px 14px' }} className="small">{descreverRecorte(r.laboratorioIds, nomePorLaboratorio, geraInstitucional)}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right' }} className="mono">{r.totalLinhas}</td>
                  <td style={{ padding: '8px 14px' }} className="small muted">
                    {new Date(r.geradoEm).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => downloadRelatorio(r.id, r.titulo)}
                    >
                      <Icon name="download" size={11} /> Baixar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
