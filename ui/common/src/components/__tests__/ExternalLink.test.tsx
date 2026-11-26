import { render, screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SVGIconKind } from '../../types/types';
import { ExternalLink } from '../ExternalLink';
import { SVGIcon } from '../SVGIcon';

describe('ExternalLink', () => {
  it('names an icon link with its label', () => {
    render(() => (
      <ExternalLink href="https://example.com" label="Website" title="Website">
        <SVGIcon kind={SVGIconKind.World} />
      </ExternalLink>
    ));

    const link = screen.getByRole('link', { name: 'Website' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('title', 'Website');
  });

  it('names a text link with its text and sets no aria-label', () => {
    render(() => <ExternalLink href="https://example.com">Landscape2</ExternalLink>);

    const link = screen.getByRole('link', { name: 'Landscape2' });
    expect(link).not.toHaveAttribute('aria-label');
  });

  it('opens other links in a new tab without opener or referrer', () => {
    render(() => <ExternalLink href="https://example.com">Example</ExternalLink>);

    const link = screen.getByRole('link', { name: 'Example' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('sets no target or rel on mailto links', () => {
    render(() => <ExternalLink href="mailto:info@example.com">Email us</ExternalLink>);

    const link = screen.getByRole('link', { name: 'Email us' });
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
  });

  it('renders the external icon as decorative', () => {
    render(() => (
      <ExternalLink href="https://example.com" visibleExternalIcon externalIconClass="extra">
        Repository
      </ExternalLink>
    ));

    const link = screen.getByRole('link', { name: 'Repository' });
    const icon = link.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveClass('extra');
  });

  it('stops the click propagation and calls onClick', async () => {
    // Setup
    const onClick = vi.fn();
    const onParentClick = vi.fn();
    render(() => (
      <div onClick={onParentClick}>
        <ExternalLink href="https://example.com" onClick={onClick}>
          Example
        </ExternalLink>
      </div>
    ));

    // Run
    await userEvent.setup().click(screen.getByRole('link', { name: 'Example' }));

    // Check
    expect(onClick).toHaveBeenCalledOnce();
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it.each(['javascript:alert(1)', 'data:text/html,x', 'vbscript:x', '/relative'])(
    'renders the children as plain text for the unsafe href %j',
    (href) => {
      render(() => (
        <ExternalLink href={href} class="extra">
          Website
        </ExternalLink>
      ));

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByText('Website')).toHaveClass('extra');
    }
  );

  it('renders no undefined class when no class is given', () => {
    render(() => (
      <ExternalLink href="https://example.com" visibleExternalIcon>
        Repository
      </ExternalLink>
    ));

    const link = screen.getByRole('link', { name: 'Repository' });
    expect(link.className).not.toContain('undefined');
    expect(link.querySelector('svg')!.getAttribute('class')).not.toContain('undefined');
  });
});
