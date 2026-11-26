import { render, screen, within } from '@solidjs/testing-library';
import { describe, expect, it, vi } from 'vitest';

import { createBaseData } from '../../../test-utils/fixtures';
import Footer from '../Footer';

vi.mock('../../../data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../data')>()),
  FOUNDATION: 'Test Foundation',
}));

describe('Footer', () => {
  it('renders only the configured social links, each with a distinct accessible name', () => {
    window.baseDS = createBaseData({
      footer: {
        links: {
          forums: 'https://forums.example.org',
          github: 'https://github.com/example',
          homepage: 'https://example.org',
          slack: 'https://slack.example.org',
        },
      },
    });

    render(() => <Footer />);

    // The other footer link is the generator one, which has a visible name
    const socialLinks = within(screen.getByRole('contentinfo'))
      .getAllByRole('link')
      .filter((link) => link.hasAttribute('aria-label'));
    const names = socialLinks.map((link) => link.getAttribute('aria-label'));
    expect(names).toEqual(['GitHub', 'Slack', 'Forums']);
    expect(new Set(names).size).toBe(names.length);
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/example');
    expect(screen.getByRole('link', { name: 'Slack' })).toHaveAttribute('href', 'https://slack.example.org');
    expect(screen.getByRole('link', { name: 'Forums' })).toHaveAttribute('href', 'https://forums.example.org');
  });

  it.each([
    ['with a foundation link', { homepage: 'https://example.org' }],
    ['without a foundation link', undefined],
  ])('names the footer logo after the foundation %s', (_, links) => {
    window.baseDS = createBaseData({ footer: { links, logo: 'images/footer_logo.svg' } });

    render(() => <Footer />);

    expect(screen.getByRole('img', { name: 'Test Foundation logo' })).toHaveAttribute(
      'src',
      './images/footer_logo.svg'
    );
  });

  it('renders no social link when the landscape configures none', () => {
    window.baseDS = createBaseData({ footer: { text: '<p>Footer text</p>' } });

    render(() => <Footer />);

    expect(screen.getByText('Footer text')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /CNCF interactive landscapes generator/ })).toBeInTheDocument();
  });
});
