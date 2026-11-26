import { render, screen } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';

import { SVGIconKind } from '../../types/types';
import { SVGIcon } from '../SVGIcon';

const ICON_KINDS = Object.values(SVGIconKind).filter((kind): kind is SVGIconKind => typeof kind === 'number');

describe('SVGIcon', () => {
  it.each(ICON_KINDS.map((kind) => [SVGIconKind[kind], kind] as const))(
    'renders the %s icon as one decorative svg',
    (_, kind) => {
      const { container } = render(() => <SVGIcon kind={kind} class="icon" />);

      const svgs = container.querySelectorAll('svg');
      expect(svgs).toHaveLength(1);
      expect(svgs[0]).toHaveAttribute('aria-hidden', 'true');
      expect(svgs[0]).toHaveAttribute('focusable', 'false');
      expect(svgs[0]).toHaveClass('icon');
      expect(svgs[0]).not.toHaveAttribute('role');
      expect(svgs[0].querySelector('title')).toBeNull();
      expect(svgs[0].children.length).toBeGreaterThan(0);
    }
  );

  it('renders a distinct drawing for every kind', () => {
    const drawings = ICON_KINDS.map((kind) => {
      const { container, unmount } = render(() => <SVGIcon kind={kind} />);
      const drawing = container.querySelector('svg')!.innerHTML;
      unmount();
      return drawing;
    });

    expect(new Set(drawings).size).toBe(ICON_KINDS.length);
  });

  it('names the icon with its title', () => {
    render(() => <SVGIcon kind={SVGIconKind.World} title="Website" />);

    const icon = screen.getByRole('img', { name: 'Website' });
    expect(icon).not.toHaveAttribute('aria-hidden');
    expect(icon).not.toHaveAttribute('focusable');
    expect(icon.querySelector('title')).toHaveTextContent('Website');
  });
});
