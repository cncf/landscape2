import { render, screen, waitFor } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createSignal } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';

import { Modal } from '../Modal';

describe('Modal', () => {
  it('shows and hides the dialog with open', () => {
    // Setup
    const [open, setOpen] = createSignal(false);
    render(() => (
      <Modal title="Details" open={open()} onClose={() => setOpen(false)}>
        Modal body
      </Modal>
    ));

    // Check
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Run
    setOpen(true);

    // Check
    const dialog = screen.getByRole('dialog', { name: 'Details modal' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveTextContent('Modal body');
    expect(document.body).toHaveClass('noScroll-modal');

    // Run
    setOpen(false);

    // Check
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body).not.toHaveClass('noScroll-modal');
  });

  it('calls onClose from the header close button', async () => {
    // Setup
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(() => (
      <Modal title="Details" header="Item details" open onClose={onClose}>
        Modal body
      </Modal>
    ));

    // Run
    await user.click(screen.getByRole('button', { name: 'Close' }));

    // Check
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose from the body close button when there is no header', async () => {
    // Setup
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(() => (
      <Modal title="Details" open onClose={onClose}>
        Modal body
      </Modal>
    ));

    // Run
    await user.click(screen.getByRole('button', { name: 'Close' }));

    // Check
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the header and the footer', () => {
    render(() => (
      <Modal title="Details" header="Item details" footer={<button type="button">Done</button>} open onClose={vi.fn()}>
        Modal body
      </Modal>
    ));

    const dialog = screen.getByRole('dialog', { name: 'Details modal' });
    expect(dialog).toHaveTextContent('Item details');
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    // Setup
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(() => (
      <Modal title="Details" open onClose={onClose}>
        Modal body
      </Modal>
    ));
    screen.getByRole('button', { name: 'Close' }).focus();

    // Run
    await user.keyboard('{Escape}');

    // Check
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('moves the focus to the scrolling body of the dialog, not to its close button, when opened', async () => {
    // Setup: make jsdom report the controls as rendered, so the hook treats them as focusable
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{} as DOMRect] as unknown as DOMRectList);
    const user = userEvent.setup();
    render(() => (
      <Modal title="Details" open onClose={vi.fn()}>
        Modal body
        <button type="button">Try again</button>
      </Modal>
    ));

    // Check
    const dialog = screen.getByRole('dialog', { name: 'Details modal' });
    const closeButton = screen.getByRole('button', { name: 'Close' });
    await waitFor(() => expect(dialog.querySelector('.modal-body')).toHaveFocus());
    expect(closeButton).not.toHaveFocus();

    // Run
    await user.tab();

    // Check
    expect(closeButton).toHaveFocus();
  });
});
