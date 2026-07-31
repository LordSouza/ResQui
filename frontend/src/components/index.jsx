// Componentes compartilhados e ícones SVG

export const Icon = ({ name, size = 16, stroke = 1.6 }) => {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></>,
    flask: <><path d="M9 3v5L4 19a2 2 0 0 0 1.8 3h12.4A2 2 0 0 0 20 19L15 8V3"/><path d="M8 3h8"/><path d="M7 14h10"/></>,
    shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></>,
    trash: <><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></>,
    truck: <><path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></>,
    clipboard: <><rect x="6" y="4" width="12" height="18" rx="1.5"/><rect x="9" y="2" width="6" height="3" rx="0.5"/><path d="M9 11h6M9 15h6M9 19h4"/></>,
    file_chart: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M9 17v-4M12 17v-6M15 17v-3"/></>,
    audit: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/><path d="M11 8v3l2 2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
    bell: <><path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 3h16z"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    download: <><path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/></>,
    upload: <><path d="M12 20V8"/><path d="M7 13l5-5 5 5"/><path d="M5 4h14"/></>,
    send: <><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></>,
    chat: <><path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z"/></>,
    close: <><path d="M6 6l12 12M18 6L6 18"/></>,
    chevron_right: <><path d="M9 6l6 6-6 6"/></>,
    chevron_down: <><path d="M6 9l6 6 6-6"/></>,
    filter: <><path d="M3 5h18l-7 9v6l-4-2v-4z"/></>,
    sparkle: <><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 14l.7 2L22 17l-2.3 1-.7 2-.7-2L16 17l2.3-1z"/></>,
    warning: <><path d="M10.3 3.5L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></>,
    check: <><path d="M5 12l5 5L20 7"/></>,
    refresh: <><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></>,
    location: <><path d="M12 22s8-7 8-13a8 8 0 1 0-16 0c0 6 8 13 8 13z"/><circle cx="12" cy="9" r="3"/></>,
    barcode: <><path d="M3 5v14M6 5v14M9 5v10M12 5v14M15 5v10M18 5v14M21 5v14"/></>,
    book: <><path d="M4 4h12a4 4 0 0 1 4 4v13H8a4 4 0 0 1-4-4z"/><path d="M8 4v13"/></>,
    bot: <><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 4v4"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/><path d="M2 14v2M22 14v2"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || <circle cx="12" cy="12" r="8"/>}
    </svg>
  );
};

export const Badge = ({ children, kind = 'gray', dot }) => (
  <span className={`badge ${kind}`}>
    {dot && <span className="dot" />}
    {children}
  </span>
);

export const Tag = ({ children }) => <span className="tag">{children}</span>;

// Status helpers
export const validadeBadge = (s) => {
  if (s === 'expira-breve') return <Badge kind="amber" dot>Expira ≤ 90d</Badge>;
  if (s === 'vencido') return <Badge kind="red" dot>Vencido</Badge>;
  return <Badge kind="green" dot>OK</Badge>;
};

export const riscoBadge = (r) => {
  if (r === 'alto') return <Badge kind="red">Alto</Badge>;
  if (r === 'medio') return <Badge kind="amber">Médio</Badge>;
  return <Badge kind="green">Baixo</Badge>;
};

export const residuoStatusBadge = (s) => {
  const map = {
    'solicitado': ['purple', 'Solicitado'],
    'aguardando-coleta': ['amber', 'Aguardando coleta'],
    'em-coleta': ['blue', 'Em coleta'],
    'rotulagem': ['gray', 'Rotulagem'],
    'destinado': ['green', 'Destinado'],
    'rejeitado': ['red', 'Rejeitado'],
  };
  const [k, l] = map[s] || ['gray', s];
  return <Badge kind={k}>{l}</Badge>;
};

// Pictograma GHS (losango vermelho + ícone)
export const Picto = ({ kind, small }) => {
  const sym = {
    flame: <path d="M12 3c1 4 5 5 5 10a5 5 0 1 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" fill="#000"/>,
    flame_circle: <><circle cx="12" cy="14" r="3" fill="none" stroke="#000" strokeWidth="1.5"/><path d="M12 4l1.5 3L17 7l-2 3 1 3-4-1-4 1 1-3-2-3 3.5 0z" fill="#000"/></>,
    bottle: <><rect x="9" y="3" width="6" height="18" rx="1" fill="none" stroke="#000" strokeWidth="1.5"/><path d="M9 8h6" stroke="#000" strokeWidth="1.5"/></>,
    corrosion: <><path d="M3 14l5-3v2l4-2v2l5-2v3l-5 2v-2l-4 2v-2z" fill="#000"/><path d="M14 16l2 4M16 16l2 3" stroke="#000" strokeWidth="1.5"/></>,
    skull: <><circle cx="12" cy="10" r="5" fill="#000"/><rect x="9" y="14" width="6" height="3" fill="#000"/><circle cx="10" cy="10" r="1" fill="#fff"/><circle cx="14" cy="10" r="1" fill="#fff"/></>,
    exclam: <><path d="M12 4L22 20H2z" fill="none" stroke="#000" strokeWidth="2"/><path d="M12 10v5M12 17v.5" stroke="#000" strokeWidth="2"/></>,
    health: <><path d="M12 4c-2 3-5 4-5 8a5 5 0 0 0 10 0c0-4-3-5-5-8z" fill="none" stroke="#000" strokeWidth="1.5"/><path d="M9 12l4 4M13 12l-4 4" stroke="#000" strokeWidth="1.5"/></>,
    envir: <><path d="M4 19c2-3 5-4 7-4M4 19c4-1 6-3 8-7M4 19l8-7-2-2-5 4z" fill="#000"/><path d="M14 5c1 2 3 3 5 3-1 2-3 4-5 4z" fill="#000"/></>,
    explosion: <><path d="M12 3l2 5 5-1-3 4 3 4-5-1-2 5-2-5-5 1 3-4-3-4 5 1z" fill="#000"/></>,
  }[kind];
  const sz = small ? 36 : 56;
  return (
    <div className="ghs-picto" style={{width: sz, height: sz}}>
      <svg width={sz*0.65} height={sz*0.65} viewBox="0 0 24 24">{sym}</svg>
    </div>
  );
};

export const SectionTitle = ({ title, sub, right }) => (
  <div className="card-h">
    <div>
      <h3>{title}</h3>
      {sub && <div className="sub">{sub}</div>}
    </div>
    {right}
  </div>
);

export const Empty = ({ children }) => <div className="empty">{children}</div>;
