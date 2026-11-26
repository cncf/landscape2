import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router';
import { render } from '@solidjs/testing-library';
import { createRenderEffect, type JSX } from 'solid-js';

import { ActiveItemProvider } from '../layout/stores/activeItem';
import { FullDataProvider } from '../layout/stores/fullData';
import { GridWidthProvider, useSetGridWidth } from '../layout/stores/gridWidth';
import { GroupActiveProvider } from '../layout/stores/groupActive';
import { MobileTOCProvider } from '../layout/stores/mobileTOC';
import { ViewModeProvider } from '../layout/stores/viewMode';
import { VisibleZoomSectionProvider } from '../layout/stores/visibleZoomSection';
import { ZoomProvider } from '../layout/stores/zoom';

/** Options for `renderWithExploreStores`. */
export interface RenderWithExploreStoresOptions extends RenderWithRouterOptions {
  /** Width of the Explore grid container, `0` (not measured yet) by default. */
  gridWidth?: number;
}

/** Options for `renderWithRouter`. */
export interface RenderWithRouterOptions {
  /** Route pattern that renders the component; matches every path by default. */
  path?: string;
  /** Initial URL of the memory history; `'/'` by default. */
  url?: string;
}

/**
 * Renders an Explore component inside a `MemoryRouter` and the stores the Explore
 * views read (full data, active item, view mode, group, zoom, grid width and the
 * mobile ToC), in the same order as the app layout. Returns what `renderWithRouter`
 * returns.
 */
export const renderWithExploreStores = (ui: () => JSX.Element, options: RenderWithExploreStoresOptions = {}) =>
  renderWithRouter(
    () => (
      <FullDataProvider>
        <ActiveItemProvider>
          <ViewModeProvider>
            <GroupActiveProvider>
              <VisibleZoomSectionProvider>
                <ZoomProvider>
                  <GridWidthProvider>
                    <MobileTOCProvider>
                      <GridWidth width={options.gridWidth ?? 0} />
                      {ui()}
                    </MobileTOCProvider>
                  </GridWidthProvider>
                </ZoomProvider>
              </VisibleZoomSectionProvider>
            </GroupActiveProvider>
          </ViewModeProvider>
        </ActiveItemProvider>
      </FullDataProvider>
    ),
    options
  );

/**
 * Renders a component inside a `MemoryRouter`, so router hooks work in tests.
 * Returns the render result plus the memory `history`, which tests use to navigate
 * (`history.set(...)`, `history.back()`).
 */
export const renderWithRouter = (ui: () => JSX.Element, options: RenderWithRouterOptions = {}) => {
  const history = createMemoryHistory();
  history.set({ value: options.url ?? '/' });

  const result = render(() => (
    <MemoryRouter history={history}>
      <Route path={options.path ?? '*'} component={ui} />
    </MemoryRouter>
  ));

  return { ...result, history };
};

/** Sets the width of the Explore grid container, as Explore does once it measures it. */
const GridWidth = (props: { width: number }) => {
  const setGridWidth = useSetGridWidth();
  createRenderEffect(() => setGridWidth(props.width));
  return null;
};
