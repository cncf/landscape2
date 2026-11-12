import { fireEvent, render, screen } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';

import { Image } from '../Image';

describe('Image', () => {
  it('uses an absolute logo url as is', () => {
    render(() => <Image name="Item" logo="https://example.com/logo.svg" />);

    expect(screen.getByRole('img', { name: 'Item logo' })).toHaveAttribute('src', 'https://example.com/logo.svg');
  });

  it('resolves a relative logo against the site root in production', () => {
    vi.stubEnv('MODE', 'production');

    render(() => <Image name="Item" logo="logos/item.svg" />);

    expect(screen.getByRole('img', { name: 'Item logo' })).toHaveAttribute('src', './logos/item.svg');
  });

  it('resolves a relative logo against the static folder in development', () => {
    vi.stubEnv('MODE', 'development');

    render(() => <Image name="Item" logo="logos/item.svg" />);

    expect(screen.getByRole('img', { name: 'Item logo' })).toHaveAttribute('src', '../../static/logos/item.svg');
  });

  it('shows the not-image icon when the image fails to load', () => {
    // Setup
    const { container } = render(() => <Image name="Item" logo="logos/item.svg" class="logo" />);

    // Run
    fireEvent.error(screen.getByRole('img', { name: 'Item logo' }));

    // Check
    expect(screen.queryByRole('img', { name: 'Item logo' })).not.toBeInTheDocument();
    const icon = container.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveClass('opacity-25', 'logo');
  });

  it('tries again when the logo changes after an error', () => {
    // Setup
    const [logo, setLogo] = createSignal('logos/broken.svg');
    render(() => <Image name="Item" logo={logo()} />);
    fireEvent.error(screen.getByRole('img', { name: 'Item logo' }));

    // Run
    setLogo('logos/item.svg');

    // Check
    expect(screen.getByRole('img', { name: 'Item logo' })).toHaveAttribute('src', './logos/item.svg');
  });

  it('loads lazily when enabled', () => {
    render(() => <Image name="Item" logo="logos/item.svg" enableLazyLoad />);

    expect(screen.getByRole('img', { name: 'Item logo' })).toHaveAttribute('loading', 'lazy');
  });

  it('uses the given alt text instead of the name', () => {
    render(() => <Image alt="QR code" name="Item" logo="images/qr_code.svg" />);

    expect(screen.getByRole('img', { name: 'QR code' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /logo/ })).not.toBeInTheDocument();
  });

  it('uses an empty alt text without a name', () => {
    const { container } = render(() => <Image logo="logos/item.svg" />);

    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('omits the width and height attributes when none are given', () => {
    render(() => <Image name="Item" logo="logos/item.svg" />);

    const img = screen.getByRole('img', { name: 'Item logo' });
    expect(img).not.toHaveAttribute('width');
    expect(img).not.toHaveAttribute('height');
    expect(img).not.toHaveAttribute('loading');
  });

  it('sets the given height', () => {
    render(() => <Image name="Item" logo="logos/item.svg" height={48} />);

    expect(screen.getByRole('img', { name: 'Item logo' })).toHaveAttribute('height', '48');
  });
});
