import { describe, it, expect } from 'vitest';
import { reducer, initialState } from '../../src/store/reducer';

// --- nav ---
describe('nav', () => {
  it('changes screen', () => {
    const s = reducer(initialState, { type: 'nav', screen: 'laboratorios' });
    expect(s.screen).toBe('laboratorios');
  });

  it('preserves other state fields', () => {
    const s = reducer(initialState, { type: 'nav', screen: 'inventario' });
    expect(s.tick).toBe(initialState.tick);
    expect(s.chatOpen).toBe(initialState.chatOpen);
  });

  it('sets flashId when provided', () => {
    const s = reducer(initialState, { type: 'nav', screen: 'inventario', flashId: 'R-001' });
    expect(s.flashId).toBe('R-001');
  });

  it('clears flashId when not provided', () => {
    const base = { ...initialState, flashId: 'old' };
    const s = reducer(base, { type: 'nav', screen: 'dashboard' });
    expect(s.flashId).toBeNull();
  });
});

// --- detail ---
describe('detail', () => {
  it('sets screen to detalhe and detailId', () => {
    const s = reducer(initialState, { type: 'detail', id: 'R-00128' });
    expect(s.screen).toBe('detalhe');
    expect(s.detailId).toBe('R-00128');
  });

  it('sets flashId to the same id', () => {
    const s = reducer(initialState, { type: 'detail', id: 'R-00128' });
    expect(s.flashId).toBe('R-00128');
  });
});

// --- openModal / closeModal ---
describe('openModal', () => {
  it('sets modal kind', () => {
    const s = reducer(initialState, { type: 'openModal', kind: 'novoReagente' });
    expect(s.modal).toBe('novoReagente');
  });

  it('sets modalReagente when provided', () => {
    const s = reducer(initialState, { type: 'openModal', kind: 'baixa', reagente: { id: 'R-001' } });
    expect(s.modalReagente).toEqual({ id: 'R-001' });
  });

  it('leaves unused modal fields as null', () => {
    const s = reducer(initialState, { type: 'openModal', kind: 'novoReagente' });
    expect(s.modalLab).toBeNull();
    expect(s.modalUsuario).toBeNull();
  });
});

describe('closeModal', () => {
  it('clears modal and all modal data fields', () => {
    const base = { ...initialState, modal: 'novoReagente', modalReagente: { id: 'X' }, modalLab: { id: 'L' } };
    const s = reducer(base, { type: 'closeModal' });
    expect(s.modal).toBeNull();
    expect(s.modalReagente).toBeNull();
    expect(s.modalLab).toBeNull();
    expect(s.modalUsuario).toBeNull();
  });
});

// --- openChat / closeChat / clearPrompt ---
describe('openChat', () => {
  it('sets chatOpen to true', () => {
    const s = reducer(initialState, { type: 'openChat' });
    expect(s.chatOpen).toBe(true);
  });

  it('sets pendingPrompt when provided', () => {
    const s = reducer(initialState, { type: 'openChat', prompt: 'test question' });
    expect(s.pendingPrompt).toBe('test question');
  });
});

describe('closeChat', () => {
  it('sets chatOpen to false', () => {
    const base = { ...initialState, chatOpen: true };
    const s = reducer(base, { type: 'closeChat' });
    expect(s.chatOpen).toBe(false);
  });
});

describe('clearPrompt', () => {
  it('clears pendingPrompt without changing chatOpen', () => {
    const base = { ...initialState, chatOpen: true, pendingPrompt: 'hello' };
    const s = reducer(base, { type: 'clearPrompt' });
    expect(s.pendingPrompt).toBeNull();
    expect(s.chatOpen).toBe(true);
  });
});

// --- openCompat ---
describe('openCompat', () => {
  it('sets screen to compat with both ids', () => {
    const s = reducer(initialState, { type: 'openCompat', a: 'R-001', b: 'R-002' });
    expect(s.screen).toBe('compat');
    expect(s.compatA).toBe('R-001');
    expect(s.compatB).toBe('R-002');
  });
});

// --- refresh ---
describe('refresh', () => {
  it('increments tick by 1', () => {
    const s = reducer(initialState, { type: 'refresh' });
    expect(s.tick).toBe(initialState.tick + 1);
  });

  it('sets optional flashId', () => {
    const s = reducer(initialState, { type: 'refresh', flashId: 'R-001' });
    expect(s.flashId).toBe('R-001');
  });

  it('clears flashId when not provided', () => {
    const base = { ...initialState, flashId: 'old' };
    const s = reducer(base, { type: 'refresh' });
    expect(s.flashId).toBeNull();
  });
});

// --- default ---
describe('default', () => {
  it('returns the same state object for unknown actions', () => {
    const s = reducer(initialState, { type: 'UNKNOWN_ACTION' });
    expect(s).toBe(initialState);
  });
});
