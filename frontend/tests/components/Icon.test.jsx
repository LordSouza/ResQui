import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Icon } from '../../src/components';

describe('Icon', () => {
  it('renders an svg element', () => {
    const { container } = render(<Icon name="flask" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('defaults size to 16', () => {
    const { container } = render(<Icon name="flask" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  it('applies custom size', () => {
    const { container } = render(<Icon name="flask" size={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('renders a circle fallback for unknown icon names', () => {
    const { container } = render(<Icon name="does_not_exist_xyz" />);
    expect(container.querySelector('circle')).toBeInTheDocument();
  });

  it('renders known icon without the fallback circle', () => {
    const { container } = render(<Icon name="flask" />);
    expect(container.querySelector('circle')).not.toBeInTheDocument();
  });
});
