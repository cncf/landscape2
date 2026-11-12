import { render, screen, waitFor } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ItemDropdown } from '../ItemDropdown';
import { Modal } from '../Modal';

describe('ItemDropdown', () => {
  it('toggles aria-expanded on the options button', async () => {
    // Setup
    const user = userEvent.setup();
    render(() => <ItemDropdown itemId="item-1" foundation="CNCF" basePath="" />);
    const button = screen.getByRole('button', { name: 'Item options' });
    const menu = document.getElementById(button.getAttribute('aria-controls')!);

    // Check
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(menu).not.toHaveClass('show');
    expect(menu).not.toHaveAttribute('role');

    // Run
    await user.click(button);

    // Check
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(menu).toHaveClass('show');

    // Run
    await user.click(button);

    // Check
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(menu).not.toHaveClass('show');
  });

  it('closes the menu on Escape and returns focus to the button', async () => {
    // Setup
    const user = userEvent.setup();
    render(() => <ItemDropdown itemId="item-1" foundation="CNCF" basePath="" />);
    const button = screen.getByRole('button', { name: 'Item options' });
    await user.click(button);
    screen.getByRole('button', { name: 'Get badge' }).focus();

    // Run
    await user.keyboard('{Escape}');

    // Check
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('keeps the enclosing modal open when Escape closes the menu', async () => {
    // Setup
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(() => (
      <Modal title="Item" open onClose={onClose}>
        <ItemDropdown itemId="item-1" foundation="CNCF" basePath="" />
      </Modal>
    ));
    // The modal moves focus inside on the next frame; wait for it before opening the menu
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());
    const button = screen.getByRole('button', { name: 'Item options' });
    await user.click(button);

    // Run
    await user.keyboard('{Escape}');

    // Check
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();

    // Run
    await user.keyboard('{Escape}');

    // Check
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('opens the badge dialog from "Get badge"', async () => {
    // Setup
    const user = userEvent.setup();
    render(() => <ItemDropdown itemId="item-1" foundation="CNCF" basePath="" />);
    await user.click(screen.getByRole('button', { name: 'Item options' }));

    // Run
    await user.click(screen.getByRole('button', { name: 'Get badge' }));

    // Check
    expect(screen.getByRole('dialog', { name: 'Badge modal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Item options' })).toHaveAttribute('aria-expanded', 'false');
  });
});
