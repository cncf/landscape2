import { render, screen } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';

import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders the text without an undefined class when no class is given', () => {
    render(() => <Badge text="Graduated" />);

    const el = screen.getByText('Graduated').closest('.badge')!;
    expect(el.className).not.toContain('undefined');
  });

  it('adds the class given', () => {
    render(() => <Badge text="Graduated" class="extra" />);

    expect(screen.getByText('Graduated').closest('.badge')).toHaveClass('extra');
  });

  it('renders the icon next to the text when given', () => {
    render(() => <Badge text="Graduated" icon={<span>icon</span>} />);

    expect(screen.getByText('icon')).toBeInTheDocument();
    expect(screen.getByText('Graduated')).toBeInTheDocument();
  });
});
