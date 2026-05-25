// Chat MCP — bolha flutuante com automações reais no site
// Usa window.claude.complete para interpretar comandos e disparar ações no app.

import { useState, useEffect, useRef } from 'react';
import { Icon, Badge, Picto } from '../components';
import { REAGENTES, RESIDUOS, COMPAT_MATRIX, AUDITORIA } from '../data';
import { pgrsTs } from '../utils';

export function ChatMCP({ state, dispatch }) {
  const open = state.chatOpen;
  const [messages, setMessages] = useState(() => [
    {
      role: 'bot',
      content: 'Olá, eu sou o assistente MCP do ResQui. Posso cadastrar reagentes, verificar compatibilidade entre substâncias, gerar rótulos GHS, abrir o Pré-MTR e navegar entre as telas. Como posso ajudar?'
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

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
    'Abrir Pré-MTR dos resíduos parados',
  ];

  const send = async (text) => {
    const t = (text ?? effectiveInput).trim();
    if (!t || busy) return;
    setInput('');
    if (state.pendingPrompt) dispatch({type: 'clearPrompt'});
    setMessages(m => [...m, {role: 'user', content: t}]);
    setBusy(true);

    // catálogo simplificado para o LLM
    const reagsCat = REAGENTES.map(r => `${r.id} ${r.nome} (CAS ${r.cas}) classe ${r.classe}`).join('\n');
    const residCat = RESIDUOS.flatMap(r => r.status === 'aguardando-coleta' ? [`${r.id} ${r.tipo} ${r.volume}${r.unidade} ${r.gerador}`] : []).join('\n');

    const sys = `Você é o assistente MCP (Model Context Protocol) do ResQui, sistema de gestão de resíduos químicos da UNIFEI.
Responda em português brasileiro, conciso e técnico, sem usar markdown.

AÇÕES disponíveis (use exatamente esses nomes):
- nav: navega para uma tela. params: { screen: "dashboard"|"inventario"|"detalhe"|"compat"|"residuos"|"mtr"|"auditoria"|"relatorios", id? }
- compat: abre o motor de compatibilidade com dois reagentes. params: { a: "R-...", b: "R-..." }
- detail: abre o detalhe de um reagente. params: { id: "R-..." }
- consume: registra baixa de consumo. params: { id: "R-...", quantidade: número, unidade: "L"|"kg" }
- generateLabel: gera rótulo GHS. params: { id: "R-..." }
- registerWaste: registra novo resíduo. params: { tipo, volume, unidade, gerador, composicao, risco: "baixo"|"medio"|"alto" }
- createMtr: cria Pré-MTR a partir dos resíduos aguardando coleta. params: { residuos?: ["W-..."] }
- listExpiring: lista itens vencendo em ≤ 90 dias. sem params.
- explain: apenas explicação/resposta sem ação. sem params.

CATÁLOGO de reagentes:
${reagsCat}

RESÍDUOS aguardando coleta:
${residCat}

FORMATO de resposta obrigatório (JSON puro, sem cercas, sem texto fora):
{
  "say": "mensagem curta para o usuário em pt-BR",
  "action": "nav|compat|detail|consume|generateLabel|registerWaste|createMtr|listExpiring|explain",
  "params": { ... }
}
Se o usuário pedir algo perigoso (mistura proibida), você deve mesmo assim chamar 'compat' para mostrar o resultado, e em 'say' alertar do risco.
Se não souber qual reagente, peça esclarecimento usando action="explain".`;

    try {
      const reply = await window.claude.complete({
        messages: [
          { role: 'user', content: sys + '\n\nUsuário: ' + t }
        ]
      });

      let parsed = null;
      try {
        const cleaned = reply.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch (e) {
        parsed = { say: reply, action: 'explain', params: {} };
      }

      // mensagem do bot
      setMessages(m => [...m, {role: 'bot', content: parsed.say || 'Pronto.'}]);

      // executar ação
      await executeAction(parsed.action, parsed.params || {}, setMessages, dispatch);

    } catch (err) {
      setMessages(m => [...m, {role: 'bot', content: 'Não consegui processar agora. Tente reformular ou use um dos atalhos abaixo.'}]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="chat-fab" onClick={() => dispatch({type: 'openChat'})} title="Assistente MCP">
        <span className="pulse"/>
        <Icon name="sparkle" size={22}/>
      </button>
    );
  }

  return (
    <div className="chat-panel">
      <div className="chat-h">
        <div className="av">M<sub style={{fontSize: '12px'}}>CP</sub></div>
        <div>
          <div className="title">Assistente MCP</div>
          <div className="sub"><span className="status-dot"/> conectado · resqui v0.7</div>
        </div>
        <button type="button" className="close" onClick={() => dispatch({type: 'closeChat'})}>
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
            aria-label="Mensagem para o assistente MCP"
            placeholder="Peça algo… (ex: posso misturar HCl e NaOH?)"
            value={effectiveInput}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            rows={1}
          />
          <button type="button" className="send" aria-label="Enviar mensagem" onClick={() => send()} disabled={!effectiveInput.trim() || busy}>
            <Icon name="send" size={14}/>
          </button>
        </div>
        <div className="chat-foot">MCP · acesso a inventário, resíduos, compat. matrix e SINIR</div>
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
        <div className="cc-h"><span className="ttl">Pré-MTR gerado</span><span className="tag">rascunho</span></div>
        <div className="cc-body">
          <div style={{fontSize: 12, fontWeight: 600}}>MTR-2025-1143</div>
          <div className="small muted" style={{marginTop: 4}}>{card.count} resíduos consolidados · {card.massa} kg · EcoQuímica SA</div>
        </div>
        <div className="cc-actions">
          <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'nav', screen: 'mtr'})}>Abrir Pré-MTR</button>
        </div>
      </div>
    );
  }
  if (card.kind === 'waste') {
    return (
      <div className="chat-card">
        <div className="cc-h"><span className="ttl">Resíduo registrado</span><span className="tag">{card.r.id}</span></div>
        <div className="cc-body">
          <div style={{fontSize: 12}}>{card.r.tipo} · {card.r.volume} {card.r.unidade}</div>
          <div className="small muted" style={{marginTop: 4}}>Gerador {card.r.gerador} · status: aguardando coleta</div>
        </div>
        <div className="cc-actions">
          <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'nav', screen: 'residuos', flashId: card.r.id})}>Abrir resíduos</button>
        </div>
      </div>
    );
  }
  if (card.kind === 'consume') {
    return (
      <div className="chat-card">
        <div className="cc-h"><span className="ttl">Baixa de consumo</span><span className="tag">{card.r.id}</span></div>
        <div className="cc-body">
          <div style={{fontSize: 12}}>{card.r.nome}</div>
          <div className="small muted" style={{marginTop: 4}}>−{card.q} {card.u} · estoque atual: {card.novo} {card.u}</div>
        </div>
        <div className="cc-actions">
          <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'detail', id: card.r.id})}>Ver reagente</button>
        </div>
      </div>
    );
  }
  return null;
}

async function executeAction(action, params, setMessages, dispatch) {
  const addCard = (card) => setMessages(m => [...m, {role: 'card', card}]);

  if (action === 'nav' && params.screen) {
    dispatch({type: 'nav', screen: params.screen, id: params.id});
    return;
  }

  if (action === 'compat') {
    const a = REAGENTES.find(r => r.id === params.a);
    const b = REAGENTES.find(r => r.id === params.b);
    if (a && b) {
      const score = COMPAT_MATRIX[a.classe][b.classe - 1];
      addCard({kind: 'compat', a, b, score});
      setTimeout(() => dispatch({type: 'openCompat', a: a.id, b: b.id}), 600);
    }
    return;
  }

  if (action === 'detail' && params.id) {
    const r = REAGENTES.find(x => x.id === params.id);
    if (r) {
      addCard({kind: 'label', r});
      setTimeout(() => dispatch({type: 'detail', id: r.id}), 400);
    }
    return;
  }

  if (action === 'generateLabel' && params.id) {
    const r = REAGENTES.find(x => x.id === params.id);
    if (r) {
      addCard({kind: 'label', r});
      setTimeout(() => dispatch({type: 'detail', id: r.id}), 600);
    }
    return;
  }

  if (action === 'consume' && params.id) {
    const r = REAGENTES.find(x => x.id === params.id);
    if (r) {
      const q = Number(params.quantidade) || 0;
      if (q <= 0) { addCard({kind: 'list', title: 'Erro', items: [{nome: 'Quantidade deve ser maior que zero.', meta: ''}]}); return; }
      if (q > r.estoque) { addCard({kind: 'list', title: 'Erro', items: [{nome: `Estoque insuficiente: ${r.estoque} ${r.unidade} disponíveis.`, meta: ''}]}); return; }
      const novo = (r.estoque - q).toFixed(2);
      r.estoque = Number(novo);
      AUDITORIA.unshift({
        ts: new Date().toISOString().slice(0, 19).replace('T', ' '),
        who: 'Lucas Souza', what: 'item.consume', where: r.local.split('·')[0].trim(),
        detail: `Baixa de ${q} ${params.unidade || r.unidade} em ${r.id} (${r.nome}) — via MCP`, risk: 'low',
      });
      addCard({kind: 'consume', r, q, u: params.unidade || r.unidade, novo});
      dispatch({type: 'refresh', flashId: r.id});
    }
    return;
  }

  if (action === 'registerWaste') {
    const lastId = RESIDUOS.map(r => parseInt(r.id.replace('W-', ''))).reduce((a, b) => Math.max(a, b), 0);
    const id = 'W-' + String(lastId + 1).padStart(4, '0');
    const novo = {
      id, tipo: params.tipo || 'Resíduo químico',
      volume: Number(params.volume) || 1, unidade: params.unidade || 'L',
      gerador: params.gerador || 'Lab-201',
      composicao: params.composicao || '—',
      risco: params.risco || 'medio',
      status: 'aguardando-coleta',
      registrado: new Date().toISOString().slice(0, 10),
      mtr: null,
    };
    RESIDUOS.unshift(novo);
    addCard({kind: 'waste', r: novo});
    dispatch({type: 'refresh', flashId: id});
    return;
  }

  if (action === 'createMtr') {
    const aguardando = RESIDUOS.filter(r => r.status === 'aguardando-coleta');
    const massa = aguardando.reduce((s, r) => s + r.volume * (r.unidade === 'kg' ? 1 : 1.1), 0).toFixed(1);
    addCard({kind: 'mtr', count: aguardando.length, massa});
    setTimeout(() => dispatch({type: 'nav', screen: 'mtr'}), 600);
    return;
  }

  if (action === 'listExpiring') {
    const items = REAGENTES.flatMap(r => r.validade_status === 'expira-breve' ? [{
      nome: r.nome, id: r.id, meta: `${r.id} · vence ${r.validade} · ${r.estoque} ${r.unidade}`
    }] : []);
    addCard({kind: 'list', title: 'Vencendo em ≤ 90 dias', items});
    return;
  }
}
