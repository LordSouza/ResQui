import { useState, useEffect, useRef } from 'react';
import { Icon } from './index';
import { useAuth } from '../auth/AuthContext';
import { useReagentes } from '../reagentes/useReagentes';
import { useResíduos } from '../residuos/useResíduos';
import { useMtrs } from '../mtrs/useMtrs';
import { useUsuarios } from '../usuarios/useUsuarios';

const MAX_POR_SECAO = 5;
const MIN_CARACTERES = 2;

function Secao({ titulo, total, erro, children, testIdTotal }) {
  return (
    <div className="busca-secao">
      <div className="busca-secao-h">
        <span>{titulo}</span>
        {!erro && <span className="mono" data-testid={testIdTotal}>{total}</span>}
      </div>
      {erro
        ? <div className="busca-erro">Não foi possível buscar {titulo.toLowerCase()}.</div>
        : children}
    </div>
  );
}

function Resultado({ titulo, sub, onClick, testId }) {
  return (
    <button type="button" className="busca-item" onClick={onClick} data-testid={testId}>
      <span className="busca-item-t">{titulo}</span>
      {sub && <span className="busca-item-s mono">{sub}</span>}
    </button>
  );
}

export function BuscaGlobal({ dispatch, inputRef }) {
  const { user } = useAuth();
  const [termo, setTermo] = useState('');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setBusca(termo.trim()), 300);
    return () => clearTimeout(t);
  }, [termo]);

  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setAberto(false); };
    if (aberto) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [aberto]);

  const admin = user?.papel === 'Admin';
  const ativo = busca.length >= MIN_CARACTERES;
  const q = busca.toLowerCase();
  const casa = (...campos) => campos.some(c => String(c ?? '').toLowerCase().includes(q));

  const reagentesQ = useReagentes({ q: busca, page: 1, pageSize: MAX_POR_SECAO }, { enabled: ativo });
  const residuosQ = useResíduos({}, { enabled: ativo });
  const mtrsQ = useMtrs({ enabled: ativo });
  const usuariosQ = useUsuarios({ enabled: ativo && admin });

  // o filtro local sobre os itens do servidor descarta resposta obsoleta de um termo anterior
  const reagentes = (reagentesQ.data?.items ?? []).filter(r => casa(r.nome, r.cas, r.id));
  const residuos = (residuosQ.data ?? []).filter(r => casa(r.descricao, r.id));
  const mtrs = (mtrsQ.data ?? []).filter(m => casa(m.numero, m.gerador, m.transportadora));
  const usuarios = admin ? (usuariosQ.data ?? []).filter(u => casa(u.nome, u.email, u.matricula)) : [];

  const totalReagentes = reagentesQ.data?.total ?? reagentes.length;
  const nenhum = reagentes.length === 0 && residuos.length === 0 && mtrs.length === 0 && usuarios.length === 0;
  const carregando = reagentesQ.isFetching || residuosQ.isFetching || mtrsQ.isFetching || usuariosQ.isFetching;

  const placeholder = admin
    ? 'Buscar reagente, resíduo, MTR ou usuário…'
    : 'Buscar reagente, resíduo ou MTR…';

  const irPara = (action) => {
    setAberto(false);
    setTermo('');
    setBusca('');
    dispatch(action);
  };

  return (
    <div className="topbar-search" ref={wrapRef}>
      <span className="icon"><Icon name="search" size={14}/></span>
      <input
        ref={inputRef}
        aria-label={placeholder}
        placeholder={placeholder}
        value={termo}
        onChange={e => { setTermo(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)}
        onKeyDown={e => { if (e.key === 'Escape') { setAberto(false); e.currentTarget.blur(); } }}
      />
      <span className="kbd">⌘K</span>

      {ativo && aberto && (
        <div className="busca-dropdown">
          {carregando && nenhum && <div className="busca-vazio">Buscando…</div>}
          {!carregando && nenhum && !reagentesQ.isError && !residuosQ.isError && !mtrsQ.isError && (
            <div className="busca-vazio">Nenhum resultado para “{busca}”.</div>
          )}

          {(reagentes.length > 0 || reagentesQ.isError) && (
            <Secao titulo="Reagentes" total={totalReagentes} erro={reagentesQ.isError} testIdTotal="total-reagentes">
              {reagentes.slice(0, MAX_POR_SECAO).map(r => (
                <Resultado key={r.id} testId="resultado-reagente"
                  titulo={r.nome} sub={r.id}
                  onClick={() => irPara({ type: 'detail', id: r.id })}/>
              ))}
            </Secao>
          )}

          {(residuos.length > 0 || residuosQ.isError) && (
            <Secao titulo="Resíduos" total={residuos.length} erro={residuosQ.isError}>
              {residuos.slice(0, MAX_POR_SECAO).map(r => (
                <Resultado key={r.id} titulo={r.descricao} sub={`#${r.id}`}
                  onClick={() => irPara({ type: 'nav', screen: 'residuos', flashId: r.id })}/>
              ))}
            </Secao>
          )}

          {(mtrs.length > 0 || mtrsQ.isError) && (
            <Secao titulo="MTRs" total={mtrs.length} erro={mtrsQ.isError}>
              {mtrs.slice(0, MAX_POR_SECAO).map(m => (
                <Resultado key={m.id} titulo={m.numero} sub={m.gerador}
                  onClick={() => irPara({ type: 'nav', screen: 'mtr', flashId: m.id })}/>
              ))}
            </Secao>
          )}

          {admin && (usuarios.length > 0 || usuariosQ.isError) && (
            <Secao titulo="Usuários" total={usuarios.length} erro={usuariosQ.isError}>
              {usuarios.slice(0, MAX_POR_SECAO).map(u => (
                <Resultado key={u.id} titulo={u.nome} sub={u.email}
                  onClick={() => irPara({ type: 'nav', screen: 'usuarios', flashId: u.id })}/>
              ))}
            </Secao>
          )}
        </div>
      )}
    </div>
  );
}
