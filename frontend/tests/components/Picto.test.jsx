import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Picto, PICTOGRAMAS_GHS } from '../../src/components';
import { PICTOS_GHS } from '../../src/data';

describe('Picto', () => {
  it('tem um arquivo de pictograma para cada chave de PICTOS_GHS', () => {
    expect(Object.keys(PICTOGRAMAS_GHS).sort()).toEqual(Object.keys(PICTOS_GHS).sort());
  });

  it('não deixa nenhum pictograma sem arte', () => {
    for (const [kind, fonte] of Object.entries(PICTOGRAMAS_GHS)) {
      expect(fonte, kind).toBeTruthy();
    }
  });

  it('descreve o pictograma pelo código e rótulo GHS', () => {
    render(<Picto kind="corrosion"/>);
    expect(screen.getByAltText('GHS05 · Corrosivo')).toBeInTheDocument();
  });

  it('não renderiza nada para uma chave desconhecida', () => {
    const { container } = render(<Picto kind="inexistente"/>);
    expect(container).toBeEmptyDOMElement();
  });
});
