import { screen, waitFor } from '@solidjs/testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_GRID_ITEMS_SIZE, DEFAULT_VIEW_MODE, FOUNDATION, overrideSettings } from '../../../data';
import { renderWithRouter } from '../../../test-utils/render';
import { ViewMode } from '../../../types';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import { FullDataProvider } from '../fullData';
import { useViewMode, ViewModeProvider } from '../viewMode';

const INITIAL_SETTINGS = {
  foundationName: FOUNDATION,
  gridSize: DEFAULT_GRID_ITEMS_SIZE,
  viewMode: DEFAULT_VIEW_MODE,
};

describe('useViewMode', () => {
  beforeEach(() => {
    // Use card as the default, so a kept grid value differs from it
    overrideSettings({ ...INITIAL_SETTINGS, viewMode: ViewMode.Card });
  });

  afterEach(() => {
    overrideSettings(INITIAL_SETTINGS);
  });

  it('keeps the grid view mode when the default is card', () => {
    renderViewMode('/?view-mode=grid');
    expect(screen.getByText('view mode: grid')).toBeInTheDocument();
  });

  it('keeps the card view mode when the default is grid', () => {
    overrideSettings({ ...INITIAL_SETTINGS, viewMode: ViewMode.Grid });

    renderViewMode('/?view-mode=card');
    expect(screen.getByText('view mode: card')).toBeInTheDocument();
  });

  it.each([
    ['an unknown value', '/?view-mode=list'],
    ['a repeated key', '/?view-mode=grid&view-mode=card'],
    ['a missing value', '/?group=g1'],
  ])('gives the default view mode for %s', (_, url) => {
    renderViewMode(url);
    expect(screen.getByText('view mode: card')).toBeInTheDocument();
  });

  it('follows a navigation to another view mode', async () => {
    // Render the store in grid view mode
    const { history } = renderViewMode('/?view-mode=grid');
    expect(screen.getByText('view mode: grid')).toBeInTheDocument();

    // Navigate to the card view mode and verify the store follows it
    history.set({ value: '/?view-mode=card' });
    await waitFor(() => expect(screen.getByText('view mode: card')).toBeInTheDocument());
  });

  it('gives the grid view mode for a card URL while the full data has failed to load', () => {
    vi.spyOn(itemsDataGetter, 'getStatus').mockReturnValue('error');

    renderViewMode('/?view-mode=card');
    expect(screen.getByText('view mode: grid')).toBeInTheDocument();
  });

  it('gives the grid view mode instead of the card default while the full data has failed to load', () => {
    vi.spyOn(itemsDataGetter, 'getStatus').mockReturnValue('error');

    renderViewMode('/?group=g1');
    expect(screen.getByText('view mode: grid')).toBeInTheDocument();
  });
});

// Helpers.

/** Displays the view mode store value. */
const ViewModeProbe = () => {
  const viewMode = useViewMode();
  return <span>view mode: {viewMode()}</span>;
};

/** Renders the view mode store, inside the full data store it reads, at the URL provided. */
const renderViewMode = (url: string) =>
  renderWithRouter(
    () => (
      <FullDataProvider>
        <ViewModeProvider>
          <ViewModeProbe />
        </ViewModeProvider>
      </FullDataProvider>
    ),
    { url }
  );
