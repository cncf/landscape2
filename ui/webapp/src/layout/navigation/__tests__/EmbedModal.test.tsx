import { screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { DEFAULT_ITEMS_STYLE_VIEW, DEFAULT_TITLE_SIZE, Style, TITLE_SIZE_RANGE } from 'common';
import { createItem } from 'common/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import { createBaseData } from '../../../test-utils/fixtures';
import { renderWithRouter } from '../../../test-utils/render';
import EmbedModal from '../EmbedModal';

const EMBED_SETUP_URL = '/embed-setup';
const OPEN_BUTTON_NAME = 'Open "Embeddable view setup" modal';

describe('EmbedModal', () => {
  beforeEach(() => {
    window.baseDS = createBaseData({
      categories: [
        {
          name: 'Category 1',
          normalized_name: 'category-1',
          subcategories: [
            { name: 'Subcategory 1', normalized_name: 'subcategory-1' },
            { name: 'Subcategory 2', normalized_name: 'subcategory-2' },
          ],
        },
        {
          name: 'Category 2',
          normalized_name: 'category-2',
          subcategories: [{ name: 'Subcategory 3', normalized_name: 'subcategory-3' }],
        },
      ],
      items: [
        createItem({ category: 'Category 1', id: 'item-1', subcategory: 'Subcategory 1' }),
        createItem({ category: 'Category 1', id: 'item-2', subcategory: 'Subcategory 2' }),
        createItem({ category: 'Category 2', id: 'item-3', subcategory: 'Subcategory 3' }),
      ],
      maturity_options: [{ name: 'graduated', normalized_name: 'graduated' }],
    });
  });

  it('shows the item modal checkbox with the Card style', async () => {
    // Setup
    const user = userEvent.setup();
    renderWithRouter(() => <EmbedModal />, { url: EMBED_SETUP_URL });

    // Run
    await user.selectOptions(screen.getByLabelText('Style'), Style.Card);

    // Check
    expect(screen.getByRole('checkbox', { name: 'Open details modal on click' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Display item name' })).not.toBeInTheDocument();
    expect(embedParams().get('item-modal')).toBe('false');
  });

  it('restores the defaults when closing and reopening the modal', async () => {
    // Setup
    const user = userEvent.setup();
    renderWithRouter(() => <EmbedModal />, { url: EMBED_SETUP_URL });
    await user.selectOptions(screen.getByLabelText('Style'), Style.Card);
    await user.selectOptions(screen.getByLabelText('Classify'), 'maturity');
    expect(embedParams().get('key')).toBe('graduated');

    // Run
    await user.click(screen.getByRole('button', { name: 'Close modal' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: OPEN_BUTTON_NAME }));

    // Check
    expect(screen.getByLabelText('Style')).toHaveValue(DEFAULT_ITEMS_STYLE_VIEW);
    expect(screen.getByLabelText('Classify')).toHaveValue('category');
    expect(embedParams().get('classify')).toBe('category');
    expect(embedParams().get('key')).toBe('category-1--subcategory-1');
    expect(embedParams().get('style')).toBe(DEFAULT_ITEMS_STYLE_VIEW);
  });

  it('restores the defaults without throwing in a landscape with no categories', async () => {
    // Setup
    window.baseDS = createBaseData();
    const user = userEvent.setup();
    renderWithRouter(() => <EmbedModal />, { url: EMBED_SETUP_URL });
    await user.selectOptions(screen.getByLabelText('Style'), Style.Card);

    // Run
    await user.click(screen.getByRole('button', { name: 'Close modal' }));
    await user.click(screen.getByRole('button', { name: OPEN_BUTTON_NAME }));

    // Check
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Style')).toHaveValue(DEFAULT_ITEMS_STYLE_VIEW);
    expect(screen.getByRole('button', { name: 'Categories list' })).toHaveTextContent('Select categories');
  });

  it('never writes NaN when the title size is cleared', async () => {
    // Setup
    const user = userEvent.setup();
    renderWithRouter(() => <EmbedModal />, { url: EMBED_SETUP_URL });
    const titleSize = screen.getByLabelText('Font size (px):');

    // Run
    await user.clear(titleSize);
    await user.tab();

    // Check
    expect(embedParams().get('title-font-size')).toBe(String(DEFAULT_TITLE_SIZE));
    expect(titleSize).toHaveValue(DEFAULT_TITLE_SIZE);
    expect(document.body).not.toHaveTextContent('NaN');
  });

  it('clamps a typed title size to its range', async () => {
    // Setup
    const user = userEvent.setup();
    renderWithRouter(() => <EmbedModal />, { url: EMBED_SETUP_URL });
    const titleSize = screen.getByLabelText('Font size (px):');

    // Run
    await user.clear(titleSize);
    await user.type(titleSize, '100');
    await user.tab();

    // Check
    expect(embedParams().get('title-font-size')).toBe(String(TITLE_SIZE_RANGE.max));
    expect(titleSize).toHaveValue(TITLE_SIZE_RANGE.max);
  });

  it('gives every control a unique id and a linked label', async () => {
    // Setup: reveal the controls shown on demand
    const user = userEvent.setup();
    renderWithRouter(() => <EmbedModal />, { url: EMBED_SETUP_URL });
    await user.click(screen.getByRole('checkbox', { name: 'Display item name' }));
    await user.click(screen.getByRole('radio', { name: 'Custom (px)' }));

    // Check the category view controls
    expectUniqueLinkedControls();

    // Check the maturity view controls
    await user.selectOptions(screen.getByLabelText('Classify'), 'maturity');
    expectUniqueLinkedControls();
  });
});

// Helpers.

/** Returns the url params of the embed preview. */
const embedParams = (): URLSearchParams => new URL(screen.getByTitle('Embed grid').getAttribute('src')!).searchParams;

/** Checks that every form control of the dialog has a unique id and at least one label. */
const expectUniqueLinkedControls = () => {
  const controls = Array.from(
    screen.getByRole('dialog').querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select')
  );
  const ids = controls.map((control) => control.id);

  expect(controls.length).toBeGreaterThan(0);
  expect(ids).not.toContain('');
  expect(new Set(ids).size).toBe(ids.length);
  controls.forEach((control) => {
    expect(control.labels?.length, `control #${control.id} has no label`).toBeGreaterThan(0);
  });
};
