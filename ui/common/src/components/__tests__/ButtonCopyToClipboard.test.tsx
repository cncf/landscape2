import { render, screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ButtonCopyToClipboard } from '../ButtonCopyToClipboard';

describe('ButtonCopyToClipboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows "Copy failed" when the execCommand fallback fails', async () => {
    // Setup
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setClipboard(undefined);
    const execCommand = vi.fn(() => false);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    render(() => <ButtonCopyToClipboard text="npm install" />);

    // Run
    await user.click(screen.getByRole('button', { name: 'Copy to clipboard' }));

    // Check
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(screen.getByRole('status')).toHaveTextContent('Copy failed');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('copies through the execCommand fallback with an off-screen readonly textarea', async () => {
    // Setup
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setClipboard(undefined);
    let textarea: HTMLTextAreaElement | null = null;
    const execCommand = vi.fn(() => {
      textarea = document.querySelector('textarea');
      return true;
    });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    render(() => <ButtonCopyToClipboard text="npm install" />);

    // Run
    await user.click(screen.getByRole('button', { name: 'Copy to clipboard' }));

    // Check
    expect(textarea).not.toBeNull();
    expect(textarea!.value).toBe('npm install');
    expect(textarea!).toHaveAttribute('readonly');
    expect(textarea!.style.position).toBe('fixed');
    expect(screen.getByRole('status')).toHaveTextContent('Copied!');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('shows "Copied!" after a Clipboard API success and hides it after 2 seconds', async () => {
    // Setup
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const writeText = vi.fn(() => Promise.resolve());
    setClipboard({ writeText });
    render(() => <ButtonCopyToClipboard text="npm install" label="Copy command" />);

    // Run
    await user.click(screen.getByRole('button', { name: 'Copy command' }));

    // Check
    expect(writeText).toHaveBeenCalledWith('npm install');
    expect(screen.getByRole('status')).toHaveTextContent('Copied!');

    // Run
    vi.advanceTimersByTime(1999);

    // Check
    expect(screen.getByRole('status')).toHaveTextContent('Copied!');

    // Run
    vi.advanceTimersByTime(1);

    // Check
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('shows "Copy failed" when the Clipboard API rejects', async () => {
    // Setup
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setClipboard({ writeText: vi.fn(() => Promise.reject(new Error('denied'))) });
    render(() => <ButtonCopyToClipboard text="npm install" />);

    // Run
    await user.click(screen.getByRole('button', { name: 'Copy to clipboard' }));

    // Check
    expect(screen.getByRole('status')).toHaveTextContent('Copy failed');
  });

  it('clears the status timer on unmount', async () => {
    // Setup
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setClipboard({ writeText: vi.fn(() => Promise.resolve()) });
    const { unmount } = render(() => <ButtonCopyToClipboard text="npm install" />);
    await user.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
    expect(vi.getTimerCount()).toBe(1);

    // Run
    unmount();

    // Check
    expect(vi.getTimerCount()).toBe(0);
  });

  it('renders the visible button text when requested', () => {
    render(() => <ButtonCopyToClipboard text="npm install" visibleBtnText />);

    expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toHaveTextContent('Copy to clipboard');
  });
});

// Helpers.

/** Replaces `navigator.clipboard`, including the stub that `userEvent.setup` installs. */
const setClipboard = (clipboard: Pick<Clipboard, 'writeText'> | undefined) => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
};
