import { screen, waitFor } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { DEFAULT_ITEMS_STYLE_VIEW, DEFAULT_TITLE_SIZE, Style, TITLE_SIZE_RANGE } from 'common';
import { createItem } from 'common/test-utils';
import { createRenderEffect } from 'solid-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createBaseData } from '../../../test-utils/fixtures';
import { renderWithExploreStores, renderWithRouter } from '../../../test-utils/render';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import { useGroupActive } from '../../stores/groupActive';
import { useViewMode } from '../../stores/viewMode';
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

  it('keeps the Explore view behind the modal while it is open and once it is closed', async () => {
    // Setup: an Explore view other than the default one, and a record of the views the stores give
    const exploreUrl = '/?group=g2&view-mode=card&maturity=graduated#category-2--subcategory-3';
    vi.spyOn(itemsDataGetter, 'getGroups').mockReturnValue(['g1', 'g2']);
    const views: string[] = [];
    const ExploreView = () => {
      const viewMode = useViewMode();
      const group = useGroupActive();
      createRenderEffect(() => views.push(`${group()} ${viewMode()}`));
      return null;
    };
    const user = userEvent.setup();
    const { history } = renderWithExploreStores(
      () => (
        <>
          <ExploreView />
          <EmbedModal />
        </>
      ),
      { url: exploreUrl }
    );

    // Run and check: the view behind the modal is unchanged, as its URL keeps the Explore params and section
    await user.click(screen.getByRole('button', { name: OPEN_BUTTON_NAME }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(views).toEqual(['g2 card']);
    expect(history.get()).toBe(
      `${EMBED_SETUP_URL}?group=g2&view-mode=card&maturity=graduated#category-2--subcategory-3`
    );

    // Run and check: closing the modal goes back to the same Explore URL and view
    await user.click(screen.getByRole('button', { name: 'Close modal' }));
    expect(history.get()).toBe(exploreUrl);
    expect(views).toEqual(['g2 card']);
  });

  it('follows Back and Forward, keeping the history entries as they are', async () => {
    // Setup: two Explore entries, with the modal opened from the last one and a setting changed
    const user = userEvent.setup();
    const { history } = renderWithRouter(() => <EmbedModal />, { url: '/?group=g1' });
    history.set({ value: '/?group=g2' });
    await user.click(screen.getByRole('button', { name: OPEN_BUTTON_NAME }));
    await user.selectOptions(screen.getByLabelText('Classify'), 'maturity');
    expect(history.get()).toBe(`${EMBED_SETUP_URL}?group=g2`);

    // Go back and check the modal closes, keeping the entry the history went to
    history.back();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(history.get()).toBe('/?group=g1');

    // Go forward and check the modal opens again with the default settings
    history.forward();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Classify')).toHaveValue('category');
    expect(history.get()).toBe(`${EMBED_SETUP_URL}?group=g2`);
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

  it('offers no "All" subcategory option for a category with a single subcategory', async () => {
    // Setup
    const user = userEvent.setup();
    renderWithRouter(() => <EmbedModal />, { url: EMBED_SETUP_URL });
    await user.click(screen.getByRole('button', { name: 'Categories list' }));
    await user.click(screen.getByRole('checkbox', { name: 'Category 2' }));
    await user.click(screen.getByRole('checkbox', { name: 'Category 1' }));
    await user.click(screen.getByRole('button', { name: 'Subcategories list' }));

    // Check: the only subcategory is the selection
    const subcategory = screen.getByRole('checkbox', { name: 'Subcategory 3' });
    expect(screen.queryByRole('checkbox', { name: 'All' })).not.toBeInTheDocument();
    expect(subcategory).toBeChecked();
    expect(subcategory).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Subcategories list' })).toHaveTextContent('Subcategory 3');
    expect(embedParams().get('key')).toBe('category-2--subcategory-3');
    expect(embedParams().has('subcategories')).toBe(false);

    // Run
    await user.click(subcategory);

    // Check
    expect(subcategory).toBeChecked();
    expect(embedParams().get('key')).toBe('category-2--subcategory-3');
  });

  it('keeps the "All" subcategory option for a category with several subcategories', async () => {
    // Setup: go to a category with a single subcategory and back
    const user = userEvent.setup();
    renderWithRouter(() => <EmbedModal />, { url: EMBED_SETUP_URL });
    await user.click(screen.getByRole('button', { name: 'Categories list' }));
    await user.click(screen.getByRole('checkbox', { name: 'Category 2' }));
    await user.click(screen.getByRole('checkbox', { name: 'Category 1' }));
    await user.click(screen.getByRole('checkbox', { name: 'Category 1' }));
    await user.click(screen.getByRole('checkbox', { name: 'Category 2' }));
    await user.click(screen.getByRole('button', { name: 'Subcategories list' }));

    // Check
    expect(screen.getByRole('checkbox', { name: 'All' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Subcategory 1' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Subcategory 1' })).toBeEnabled();
    expect(embedParams().get('key')).toBe('category-1--subcategory-1');

    // Run
    await user.click(screen.getByRole('checkbox', { name: 'Subcategory 1' }));

    // Check
    expect(screen.getByRole('checkbox', { name: 'All' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Subcategories list' })).toHaveTextContent('All subcategories');
    expect(embedParams().get('key')).toBe('category-1');
  });

  it('keeps the only category of a landscape selected', async () => {
    // Setup
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
      ],
      items: [
        createItem({ category: 'Category 1', id: 'item-1', subcategory: 'Subcategory 1' }),
        createItem({ category: 'Category 1', id: 'item-2', subcategory: 'Subcategory 2' }),
      ],
    });
    const user = userEvent.setup();
    renderWithRouter(() => <EmbedModal />, { url: EMBED_SETUP_URL });
    await user.click(screen.getByRole('button', { name: 'Categories list' }));
    const category = screen.getByRole('checkbox', { name: 'Category 1' });
    expect(category).toBeChecked();
    expect(category).toBeDisabled();

    // Run
    await user.click(category);

    // Check
    expect(category).toBeChecked();
    expect(screen.getByRole('button', { name: 'Categories list' })).toHaveTextContent('Category 1');
    expect(embedParams().get('key')).toBe('category-1--subcategory-1');
    await user.click(screen.getByRole('button', { name: 'Subcategories list' }));
    expect(screen.getByRole('checkbox', { name: 'All' })).toBeInTheDocument();
  });

  it('offers the "All" maturity and TAG options only when there are several options', async () => {
    // Setup: a single maturity option and two TAG options
    window.baseDS = {
      ...window.baseDS,
      tag_options: [
        { name: 'tag-a', normalized_name: 'tag-a' },
        { name: 'tag-b', normalized_name: 'tag-b' },
      ],
    };
    const user = userEvent.setup();
    renderWithRouter(() => <EmbedModal />, { url: EMBED_SETUP_URL });

    // Run
    await user.selectOptions(screen.getByLabelText('Classify'), 'maturity');

    // Check
    expect(selectValues('Maturity')).toEqual(['graduated']);
    expect(embedParams().get('key')).toBe('graduated');

    // Run
    await user.selectOptions(screen.getByLabelText('Classify'), 'tag');
    await user.selectOptions(screen.getByLabelText('TAG'), 'all');

    // Check
    expect(selectValues('TAG')).toEqual(['all', 'tag-a', 'tag-b']);
    expect(embedParams().get('key')).toBe('all');
  });
});

// Helpers.

/** Returns the url params of the embed preview. */
const embedParams = (): URLSearchParams => new URL(screen.getByTitle('Embed grid').getAttribute('src')!).searchParams;

/** Returns the option values of the select with the given label. */
const selectValues = (label: string): string[] =>
  Array.from((screen.getByLabelText(label) as HTMLSelectElement).options).map((option) => option.value);

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
