import { useState, useEffect, useRef } from 'react';
import { Icon, Badge, Picto } from '../components';
import { apiFetch } from '../lib/api';
import { useReagentes } from '../reagentes/useReagentes';
import { useResíduos } from '../residuos/useResíduos';
import { useAssistente } from './useAssistente';
import { quantidadesResiduos, formatarQuantidade } from '../utils';

export function AssistenteChat({ state, dispatch }) {
  const open = state.chatOpen;
  const [messages, setMessages] = useState(() => [
    {
      role: 'bot',
      content: 'Olá, eu sou o assistente do ResQui. Posso cadastrar reagentes, verificar compatibilidade entre substâncias, gerar rótulos GHS, abrir os manifestos de coleta e navegar entre as telas. Como posso ajudar?'
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  const { data: reagsData } = useReagentes({ pageSize: 200 });
  const reagentes = reagsData?.items ?? [];
  const { data: residuos = [] } = useResíduos();

  // derive pending prompt from state instead of mirroring into local state
  const effectiveInput = state.pendingPrompt ?? input;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  const suggestions = [
    'Verifique se HCl e Peróxido podem ficar juntos',
    'O que está vencendo nas próximas semanas?',
    'Gerar rótulo do Metanol',
    'Registrar 2L de acetona usada no Lab-203',
    'Abrir manifestos dos resíduos parados',
  ];

  const assistente = useAssistente();
  const indisponivel = assistente.error?.status === 503;

  const send = async (text) => {
    const t = (text ?? effectiveInput).trim();
    if (!t || busy || indisponivel) return;
    setInput('');
    if (state.pendingPrompt) dispatch({type: 'clearPrompt'});
    setMessages(m => [...m, {role: 'user', content: t}]);
    setBusy(true);

    const historico = messages
      .filter(m => m.role === 'user' || m.role === 'bot')
      .slice(-6)
      .map(m => ({ Papel: m.role, Texto: m.content }));

    try {
      const resposta = await assistente.mutateAsync({ mensagem: t, historico });
      setMessages(m => [...m, {role: 'bot', content: resposta.say || 'Pronto.'}]);
      await executeAction(resposta.action, resposta.params || {}, {
        reagentes, residuos,
        addCard: (card) => setMessages(m => [...m, {role: 'card', card}]),
        dispatch,
      });
    } catch (err) {
      setMessages(m => [...m, {role: 'bot', content: err.message || 'Não consegui processar agora.'}]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="chat-fab" onClick={() => dispatch({type: 'openChat'})} title="Assistente ResQui" aria-label="Abrir assistente">
        <span className="pulse"/>
        <Icon name="sparkle" size={22}/>
      </button>
    );
  }

  return (
    <div className="chat-panel" role="region" aria-label="Assistente ResQui"
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); dispatch({type: 'closeChat'}); } }}>
      <div className="chat-h">
        <div className="av">R<sub style={{fontSize: '12px'}}>Q</sub></div>
        <div>
          <div className="title">Assistente ResQui</div>
          <div className="sub">
            {indisponivel
              ? 'assistente não configurado'
              : <><span className="status-dot"/> conectado</>}
          </div>
        </div>
        <button type="button" className="close" aria-label="Fechar assistente" onClick={() => dispatch({type: 'closeChat'})}>
          <Icon name="close" size={16}/>
        </button>
      </div>

      <div className="chat-body" ref={scrollRef}>
        {messages.map((m, i) => {
          const stableKey = m.role === 'card'
            ? `card-${m.card?.kind ?? ''}-${m.content?.slice(0, 8) ?? i}`
            : `${m.role}-${(m.content ?? '').slice(0, 8)}-${i}`;
          if (m.role === 'card') return <ChatCard key={stableKey} card={m.card} dispatch={dispatch}/>;
          return <div key={stableKey} className={`msg ${m.role}`}>{m.content}</div>;
        })}
        {busy && <div className="msg bot thinking">analisando…</div>}
      </div>

      {messages.length <= 2 && (
        <div className="chat-suggest">
          {suggestions.map((s) => (
            <button type="button" key={s} className="sug" onClick={() => send(s)}>{s}</button>
          ))}
        </div>
      )}

      <div className="chat-input-wrap">
        <div className="chat-input">
          <textarea
            aria-label="Mensagem para o assistente ResQui"
            placeholder="Peça algo… (ex: posso misturar HCl e NaOH?)"
            value={effectiveInput}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            rows={1}
            disabled={indisponivel}
          />
          <button type="button" className="send" aria-label="Enviar mensagem" onClick={() => send()} disabled={!effectiveInput.trim() || busy || indisponivel}>
            <Icon name="send" size={14}/>
          </button>
        </div>
        <div className="chat-foot">Acesso a inventário, resíduos, compatibilidade e manifestos</div>
      </div>
    </div>
  );
}

// Renderiza cards interativos dentro do chat
function ChatCard({ card, dispatch }) {
  if (card.kind === 'compat') {
    const { a, b, score } = card;
    const kind = score >= 2 ? 'red' : score === 1 ? 'amber' : 'green';
    const lbl = score === 0 ? 'Compatível' : score === 1 ? 'Cautela' : score === 2 ? 'Perigo' : 'Proibido';
    return (
      <div className="chat-card">
        <div className="cc-h">
          <span className="ttl">Resultado de compatibilidade</span>
          <span className="tag">nível {score}/3</span>
        </div>
        <div className="cc-body">
          <div style={{display: 'flex', gap: 8, marginBottom: 8}}>
            <Badge kind={kind} dot>{lbl}</Badge>
          </div>
          <div style={{fontSize: 12}}><b>{a.nome}</b> ({a.id}) + <b>{b.nome}</b> ({b.id})</div>
          <div className="small muted" style={{marginTop: 4}}>Classes {a.classe} × {b.classe}</div>
        </div>
        <div className="cc-actions">
          <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'openCompat', a: a.id, b: b.id})}>Abrir motor</button>
        </div>
      </div>
    );
  }
  if (card.kind === 'list') {
    return (
      <div className="chat-card">
        <div className="cc-h"><span className="ttl">{card.title}</span><span className="tag">{card.items.length} itens</span></div>
        <div style={{maxHeight: 200, overflow: 'auto'}}>
          {card.items.map((it, i) => (
            <button type="button" key={it.id ?? `item-${(it.nome ?? '').slice(0, 8)}-${i}`}
              className="chat-list-item"
              style={{cursor: it.id ? 'pointer' : 'default'}}
              onClick={() => it.id && dispatch({type: 'detail', id: it.id})}>
              <div style={{fontWeight: 500}}>{it.nome}</div>
              <div className="mono small muted">{it.meta}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (card.kind === 'label') {
    return (
      <div className="chat-card">
        <div className="cc-h"><span className="ttl">Rótulo GHS gerado</span><span className="tag">{card.r.id}</span></div>
        <div className="cc-body">
          <div style={{fontSize: 12}}>{card.r.nome} · {card.r.signal}</div>
          <div style={{display: 'flex', gap: 4, marginTop: 6}}>
            {card.r.pictos.map((p) => <Picto key={p} kind={p} small/>)}
          </div>
        </div>
        <div className="cc-actions">
          <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'detail', id: card.r.id})}>Abrir rótulo</button>
        </div>
      </div>
    );
  }
  if (card.kind === 'mtr') {
    return (
      <div className="chat-card">
        <div className="cc-h"><span className="ttl">Manifesto gerado</span><span className="tag">rascunho</span></div>
        <div className="cc-body">
          <div style={{fontSize: 12, fontWeight: 600}}>Manifesto (rascunho)</div>
          <div className="small muted" style={{marginTop: 4}}>{card.count} resíduos consolidados · {card.quantidade}</div>
        </div>
        <div className="cc-actions">
          <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'nav', screen: 'mtr'})}>Abrir manifestos</button>
        </div>
      </div>
    );
  }
  return null;
}

export async function executeAction(action, params, { reagentes, residuos, addCard, dispatch }) {
  const erro = (msg) => addCard({kind: 'list', title: 'Erro', items: [{nome: msg, meta: ''}]});

  if (action === 'nav' && params.screen) {
    dispatch({type: 'nav', screen: params.screen, id: params.id});
    return;
  }

  if (action === 'compat') {
    const a = reagentes.find(r => r.id === params.a);
    const b = reagentes.find(r => r.id === params.b);
    if (!a || !b) { erro('Reagente não encontrado no inventário.'); return; }
    try {
      const res = await apiFetch('/api/compat', { params: { classeA: a.classe, classeB: b.classe } });
      const { nivel } = await res.json();
      addCard({kind: 'compat', a, b, score: nivel});
      setTimeout(() => dispatch({type: 'openCompat', a: a.id, b: b.id}), 600);
    } catch (err) { erro(err.message); }
    return;
  }

  if ((action === 'detail' || action === 'generateLabel') && params.id) {
    const r = reagentes.find(x => x.id === params.id);
    if (!r) { erro('Reagente não encontrado.'); return; }
    addCard({kind: 'label', r});
    setTimeout(() => dispatch({type: 'detail', id: r.id}), 500);
    return;
  }

  if (action === 'consume' && params.id) {
    const r = reagentes.find(x => x.id === params.id);
    if (!r) { erro('Reagente não encontrado.'); return; }
    dispatch({
      type: 'openModal',
      kind: 'baixa',
      reagente: r,
      baixaInicial: { quantidade: Number(params.quantidade) || '' },
    });
    addCard({kind: 'list', title: 'Baixa aberta', items: [{nome: 'Confira a quantidade e confirme a baixa.', meta: ''}]});
    return;
  }

  if (action === 'registerWaste') {
    dispatch({
      type: 'openModal',
      kind: 'novoResiduo',
      residuoInicial: {
        tipo: params.tipo || '',
        volume: params.volume ?? '',
        unidade: params.unidade || 'L',
        laboratorioId: residuos[0]?.lab_id || '',
        composicao: params.composicao || '',
        risco: params.risco || 'medio',
      },
    });
    addCard({kind: 'list', title: 'Registro aberto', items: [{nome: 'Escolha as classes de reatividade e confirme o registro.', meta: ''}]});
    return;
  }

  if (action === 'createMtr') {
    const aguardando = residuos.filter(r => r.status === 'aguardando-coleta');
    const quantidade = formatarQuantidade(quantidadesResiduos(aguardando));
    addCard({kind: 'mtr', count: aguardando.length, quantidade});
    setTimeout(() => dispatch({type: 'nav', screen: 'mtr'}), 600);
    return;
  }

  if (action === 'listExpiring') {
    try {
      const res = await apiFetch('/api/reagentes', { params: { vencendo: true, pageSize: 200 } });
      const data = await res.json();
      const items = data.items.map(r => ({
        nome: r.nome, id: r.id, meta: `${r.id} · ${r.validadeStatus} · ${r.estoque} ${r.unidade}`,
      }));
      addCard({kind: 'list', title: 'Vencendo em ≤ 90 dias', items});
    } catch (err) { erro(err.message); }
    return;
  }
}
