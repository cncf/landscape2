import { render, screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BadgeModal } from '../BadgeModal';

const BADGE_URL = 'https://img.shields.io/badge/Open--Source__Foundation%20X%20Landscape-5699C6';
const ITEM_URL = `${location.origin}/landscape/?item=item-1`;

describe('BadgeModal', () => {
  it('shows the markdown badge link first', () => {
    renderBadgeModal();

    expect(screen.getByRole('dialog', { name: 'Badge modal' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Markdown' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('img', { name: 'Landscape badge' })).toHaveAttribute('src', BADGE_URL);
    expect(screen.getByText(`[![Open-Source_Foundation X Landscape](${BADGE_URL})](${ITEM_URL})`)).toBeInTheDocument();
  });

  it('switches to the AsciiDoc badge link', async () => {
    // Setup
    const user = userEvent.setup();
    renderBadgeModal();

    // Run
    await user.click(screen.getByRole('tab', { name: 'AsciiDoc' }));

    // Check
    expect(screen.getByRole('tab', { name: 'AsciiDoc' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('img', { name: 'Landscape badge' })).toHaveAttribute('src', BADGE_URL);
    expect(screen.getByText(`${ITEM_URL}[image:${BADGE_URL}[Open-Source_Foundation X LANDSCAPE]]`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy badge Ascii link to clipboard' })).toBeInTheDocument();
  });

  it('calls onCloseModal from the footer button', async () => {
    // Setup
    const user = userEvent.setup();
    const onCloseModal = vi.fn();
    renderBadgeModal(onCloseModal);

    // Run
    await user.click(screen.getByRole('button', { name: 'Close modal' }));

    // Check
    expect(onCloseModal).toHaveBeenCalledOnce();
  });
});

// Helpers.

/** Renders an open badge modal for a foundation name with a dash, an underscore and a space. */
const renderBadgeModal = (onCloseModal = vi.fn()) =>
  render(() => (
    <BadgeModal
      itemId="item-1"
      foundation="Open-Source_Foundation X"
      basePath="/landscape"
      openStatus
      onCloseModal={onCloseModal}
    />
  ));
