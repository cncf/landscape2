import { fireEvent, render, screen } from '@solidjs/testing-library';
import { Size } from 'common/embed';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Image from '../Image';

describe('Image', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('uses an absolute logo url as it is', () => {
    render(() => <Image name="Item" logo="https://cdn.example/item.svg" />);

    expect(screen.getByRole('img', { name: 'Item logo' })).toHaveAttribute('src', 'https://cdn.example/item.svg');
  });

  it('prefixes a relative logo with the landscape base path', () => {
    // Setup
    window.history.replaceState(null, '', '/embed/embed.html?key=category-1&base-path=/landscape');

    // Run
    render(() => <Image name="Item" logo="logos/item.svg" />);

    // Check
    expect(screen.getByRole('img', { name: 'Item logo' })).toHaveAttribute('src', '/landscape/logos/item.svg');
  });

  it('prefixes a relative logo with the landscape root for base-path=/', () => {
    // Setup
    window.history.replaceState(null, '', '/embed/embed.html?key=category-1&base-path=/');

    // Run
    render(() => <Image name="Item" logo="logos/item.svg" />);

    // Check
    expect(screen.getByRole('img', { name: 'Item logo' })).toHaveAttribute('src', '/logos/item.svg');
  });

  it('prefixes a relative logo with the development server origin in development', () => {
    // Setup
    vi.stubEnv('MODE', 'development');
    window.history.replaceState(null, '', '/embed/embed.html?key=category-1&base-path=/landscape');

    // Run
    render(() => <Image name="Item" logo="logos/item.svg" />);

    // Check
    expect(screen.getByRole('img', { name: 'Item logo' })).toHaveAttribute(
      'src',
      'http://localhost:8000/logos/item.svg'
    );
  });

  it('ignores an invalid base path', () => {
    // Setup
    window.history.replaceState(null, '', '/embed/embed.html?key=category-1&base-path=//evil.example');

    // Run
    render(() => <Image name="Item" logo="logos/item.svg" />);

    // Check
    expect(screen.getByRole('img', { name: 'Item logo' })).toHaveAttribute('src', '/logos/item.svg');
  });

  it('loads the logo lazily', () => {
    render(() => <Image name="Item" logo="logos/item.svg" />);

    expect(screen.getByRole('img', { name: 'Item logo' })).toHaveAttribute('loading', 'lazy');
  });

  it('replaces a logo that fails to load with a decorative fallback icon', () => {
    // Setup
    const { container } = render(() => <Image name="Item" logo="logos/item.svg" size={Size.Small} />);

    // Run
    fireEvent.error(screen.getByRole('img', { name: 'Item logo' }));

    // Check
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
