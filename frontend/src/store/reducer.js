import { REAGENTES } from '../data';

export const initialState = {
  screen: 'dashboard',
  detailId: null,
  chatOpen: false,
  pendingPrompt: null,
  flashId: null,
  compatA: null,
  compatB: null,
  tick: 0,
  modal: null,
  modalReagente: null,
  modalLab: null,
  modalUsuario: null,
  modalResiduo: null,
};

export function reducer(state, action) {
  switch (action.type) {
    case 'nav':
      return { ...state, screen: action.screen, detailId: action.id || state.detailId, flashId: action.flashId || null };
    case 'detail':
      return { ...state, screen: 'detalhe', detailId: action.id, flashId: action.id };
    case 'openChat':
      return { ...state, chatOpen: true, pendingPrompt: action.prompt || null };
    case 'closeChat':
      return { ...state, chatOpen: false };
    case 'clearPrompt':
      return { ...state, pendingPrompt: null };
    case 'openCompat':
      return { ...state, screen: 'compat', compatA: action.a, compatB: action.b };
    case 'setCompat':
      return { ...state, compatA: action.a !== undefined ? action.a : state.compatA, compatB: action.b !== undefined ? action.b : state.compatB };
    case 'refresh':
      return { ...state, tick: state.tick + 1, flashId: action.flashId || null };
    case 'openModal':
      return {
        ...state,
        modal: action.kind,
        modalReagente: action.reagente || null,
        modalLab: action.lab || null,
        modalUsuario: action.usuario || null,
        modalResiduo: action.residuo || null,
      };
    case 'closeModal':
      return { ...state, modal: null, modalReagente: null, modalLab: null, modalUsuario: null, modalResiduo: null };
    case 'consume': {
      const r = REAGENTES.find(x => x.id === action.id);
      if (r) r.estoque = Math.max(0, Number((r.estoque - (action.quantidade || 0.1)).toFixed(2)));
      return { ...state, tick: state.tick + 1, flashId: action.id };
    }
    default:
      return state;
  }
}
