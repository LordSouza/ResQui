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
  modalResiduoInicial: null,
  modalBaixaInicial: null,
  residuosStatusInicial: null,
  inventarioVencendoInicial: false,
};

export function reducer(state, action) {
  switch (action.type) {
    case 'nav':
      return {
        ...state, screen: action.screen, detailId: action.id || state.detailId, flashId: action.flashId || null,
        residuosStatusInicial: action.residuosStatus || null,
        inventarioVencendoInicial: action.inventarioVencendo || false,
      };
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
        modalResiduoInicial: action.residuoInicial || null,
        modalBaixaInicial: action.baixaInicial || null,
      };
    case 'closeModal':
      return { ...state, modal: null, modalReagente: null, modalLab: null, modalUsuario: null, modalResiduo: null, modalResiduoInicial: null, modalBaixaInicial: null };
    default:
      return state;
  }
}
