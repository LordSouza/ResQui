import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../../src/components';

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Vencido</Badge>);
    expect(screen.getByText('Vencido')).toBeInTheDocument();
  });

  it('applies the kind as a CSS class', () => {
    const { container } = render(<Badge kind="red">text</Badge>);
    expect(container.firstChild).toHaveClass('red');
  });

  it('always has the badge base class', () => {
    const { container } = render(<Badge>text</Badge>);
    expect(container.firstChild).toHaveClass('badge');
  });

  it('defaults kind to gray', () => {
    const { container } = render(<Badge>text</Badge>);
    expect(container.firstChild).toHaveClass('gray');
  });

  it('renders a .dot span when dot prop is passed', () => {
    const { container } = render(<Badge dot>text</Badge>);
    expect(container.querySelector('.dot')).toBeInTheDocument();
  });

  it('does not render a .dot span without the dot prop', () => {
    const { container } = render(<Badge>text</Badge>);
    expect(container.querySelector('.dot')).not.toBeInTheDocument();
  });
});
