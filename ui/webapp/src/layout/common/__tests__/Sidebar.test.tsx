import { render, screen, waitFor } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createSignal } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';

import { Sidebar } from '../Sidebar';

const BODY_SCROLL_LOCK_CLASS = 'noScroll-sidebar';

describe('Sidebar', () => {
  it('renders a dialog and moves the focus inside it when opened', async () => {
    const user = userEvent.setup();
    renderSidebar();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Open the sidebar
    await user.click(screen.getByRole('button', { name: 'Open filters' }));

    // Check the dialog semantics and the focus
    const dialog = screen.getByRole('dialog', { name: 'Filters' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
  });

  it('drops the inner complementary landmark', () => {
    renderSidebar({ open: true });

    expect(screen.getByRole('complementary', { name: 'Filters' })).toContainElement(screen.getByRole('dialog'));
    expect(screen.getAllByRole('complementary')).toHaveLength(1);
  });

  it('calls onOpenStatusChange(false) when Escape is pressed', async () => {
    const user = userEvent.setup();
    const { onOpenStatusChange } = renderSidebar({ open: true });
    const dialog = screen.getByRole('dialog', { name: 'Filters' });
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

    await user.keyboard('{Escape}');

    expect(onOpenStatusChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each(['Close sidebar', 'Close'])(
    'calls onOpenStatusChange(false) when the "%s" button is clicked',
    async (name) => {
      const user = userEvent.setup();
      const { onOpenStatusChange } = renderSidebar({ open: true });

      await user.click(screen.getByRole('button', { name }));

      expect(onOpenStatusChange).toHaveBeenLastCalledWith(false);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }
  );

  it('releases the body scroll lock when closed and when unmounted', async () => {
    const user = userEvent.setup();

    // Open the sidebar and check the body scroll is locked
    const { unmount } = renderSidebar();
    await user.click(screen.getByRole('button', { name: 'Open filters' }));
    expect(document.body).toHaveClass(BODY_SCROLL_LOCK_CLASS);

    // Close it and check the lock is released
    await user.click(screen.getByRole('button', { name: 'Close sidebar' }));
    expect(document.body).not.toHaveClass(BODY_SCROLL_LOCK_CLASS);

    // Open it again, unmount it and check the lock is released
    await user.click(screen.getByRole('button', { name: 'Open filters' }));
    expect(document.body).toHaveClass(BODY_SCROLL_LOCK_CLASS);
    unmount();
    expect(document.body).not.toHaveClass(BODY_SCROLL_LOCK_CLASS);
  });

  it('restores the focus to the button that opened it when closed', async () => {
    const user = userEvent.setup();
    renderSidebar();
    const openButton = screen.getByRole('button', { name: 'Open filters' });

    // Open the sidebar and wait for the focus to move inside
    await user.click(openButton);
    const dialog = screen.getByRole('dialog', { name: 'Filters' });
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

    // Close it and check the focus returns to the open button
    await user.keyboard('{Escape}');
    expect(openButton).toHaveFocus();
  });
});

// Helpers.

/**
 * Renders a filters sidebar opened by an "Open filters" button outside it, as the
 * pages do, whose open status follows `onOpenStatusChange`. Returns that callback
 * mock and `unmount`.
 */
const renderSidebar = (options: { open?: boolean } = {}) => {
  const onOpenStatusChange = vi.fn();
  const [open, setOpen] = createSignal(options.open ?? false);
  const { unmount } = render(() => (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open filters
      </button>
      <Sidebar
        label="Filters"
        header="Filters"
        visibleButton={false}
        open={open()}
        onOpenStatusChange={(status) => {
          onOpenStatusChange(status);
          setOpen(status);
        }}
      >
        <button type="button">Sidebar option</button>
      </Sidebar>
    </>
  ));
  return { onOpenStatusChange, unmount };
};
