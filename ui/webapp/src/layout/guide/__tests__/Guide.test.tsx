import { createMemoryHistory, MemoryRouter, Navigator, Route, RouteSectionProps, useNavigate } from '@solidjs/router';
import { render, screen, within } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createTextElement, flushPromises, guideFixture } from 'common/test-utils';
import { createRenderEffect } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GUIDE_PATH } from '../../../data';
import { Guide as GuideData, StateContent, ToCTitle } from '../../../types';
import goToElement from '../../../utils/goToElement';
import { GuideFileProvider, useSetGuideFileContent, useSetGuideTOC } from '../../stores/guideFile';
import { MobileTOCProvider, useMobileTOCStatus, useSetMobileTOCStatus } from '../../stores/mobileTOC';
import Guide from '..';
import { getToCOptionId } from '../ToC';

vi.mock('../../../utils/goToElement', () => ({ default: vi.fn() }));
vi.mock('../../../utils/scrollToTop', () => ({ default: vi.fn() }));
vi.mock('../../common/ButtonToTopScroll', () => ({ default: () => createTextElement('Top') }));
vi.mock('../../navigation/Footer', () => ({ default: () => createTextElement('Footer') }));
vi.mock('../SubcategoryExtended', () => ({ default: () => createTextElement('Extended') }));

/** Anchor ids of the guide fixture sections, in ToC order. */
const SECTION_IDS = ['category-1', 'category-1--subcategory-1-1', 'category-2'];
/** ToC of the guide fixture. */
const GUIDE_TOC: ToCTitle[] = [
  {
    id: 'category-1',
    options: [{ id: 'category-1--subcategory-1-1', title: 'Subcategory 1-1' }],
    title: 'Category 1',
  },
  { id: 'category-2', options: [], title: 'Category 2' },
];

const fetchMock = vi.fn<typeof fetch>();
const goToElementMock = vi.mocked(goToElement);
// jsdom has no scrollIntoView, which the guide uses to show the active ToC option
const scrollIntoViewMock = vi.fn();

describe('Guide', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    window.guide = undefined;
  });

  afterEach(() => {
    fetchMock.mockReset();
    goToElementMock.mockReset();
    scrollIntoViewMock.mockReset();
    delete (Element.prototype as Partial<Element>).scrollIntoView;
    window.guide = undefined;
  });

  it('recovers from a failed guide request', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce(Response.json(guideFixture));

    // Render the guide while its request fails
    renderGuide(GUIDE_PATH);
    await flushPromises();
    expect(screen.getByText("We couldn't load the guide.")).toBeInTheDocument();
    expect(screen.queryByText('Footer')).not.toBeInTheDocument();

    // Retry the request
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await flushPromises();

    // Check the guide content loads
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('heading', { level: 1, name: 'Category 1' })).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('renders the inline guide without fetching it', async () => {
    window.guide = guideFixture;

    // Render the guide shipped inline in the page
    renderGuide(GUIDE_PATH);
    await flushPromises();

    // Check its sections render without a guide request
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1, name: 'Category 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Subcategory 1-1' })).toBeInTheDocument();
  });

  it('renders the cached guide synchronously', () => {
    renderGuide(GUIDE_PATH, { cached: { guide: guideFixture, toc: GUIDE_TOC } });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1, name: 'Category 2' })).toBeInTheDocument();
  });

  it('navigates an empty hash to the first section', async () => {
    window.guide = guideFixture;

    const { history } = renderGuide(GUIDE_PATH);
    await flushPromises();

    expect(history.get()).toBe(`${GUIDE_PATH}#category-1`);
  });

  it('gives each section the anchor id of its ToC option', async () => {
    const user = userEvent.setup();
    window.guide = guideFixture;

    // Render the guide
    const { history } = renderGuide(GUIDE_PATH);
    await flushPromises();

    // Check every ToC option has a section with the same anchor id
    SECTION_IDS.forEach((id) => {
      expect(document.getElementById(getToCOptionId('desktop', id))).toBeInTheDocument();
      expect(document.getElementById(`section_${id}`)).toBeInTheDocument();
    });

    // Open a subcategory from the desktop ToC and check its section is the target
    const desktopToC = document.getElementById('desktop_menu')!;
    await user.click(within(desktopToC).getByRole('button', { name: 'Open Subcategory 1-1 section' }));
    expect(history.get()).toBe(`${GUIDE_PATH}#category-1--subcategory-1-1`);
    expect(goToElementMock).toHaveBeenLastCalledWith('section_category-1--subcategory-1-1');
  });

  it.each([
    ['without a from state', undefined],
    ['opened from the Explore view', { from: 'explore' }],
  ])('keeps a hash deep link %s and scrolls to its section and ToC option', async (_, state) => {
    window.guide = guideFixture;

    // Render the guide from a subcategory deep link
    const { history } = renderGuide(`${GUIDE_PATH}#category-1--subcategory-1-1`, { state });
    await flushPromises();

    // Check the hash is kept and the section is scrolled into view
    expect(history.get()).toBe(`${GUIDE_PATH}#category-1--subcategory-1-1`);
    await vi.waitFor(() => expect(goToElementMock).toHaveBeenCalledWith('section_category-1--subcategory-1-1'));

    // Check the matching desktop ToC option is scrolled into view
    const tocOption = document.getElementById(getToCOptionId('desktop', 'category-1--subcategory-1-1'));
    await vi.waitFor(() => expect(scrollIntoViewMock.mock.contexts).toContain(tocOption));
  });

  it.each([
    ['without a from state', undefined],
    ['opened from the Explore view', { from: 'explore' }],
  ])('keeps a non-ASCII hash deep link %s and scrolls to its section and ToC option', async (_, state) => {
    const guide = structuredClone(guideFixture);
    guide.categories![0].subcategories![0].normalized_name = 'sub-é';
    window.guide = guide;

    // Render the guide from a subcategory deep link, encoded as the browser gives it
    const { history } = renderGuide(`${GUIDE_PATH}#category-1--sub-%C3%A9`, { state });
    await flushPromises();

    // Check the hash is kept and the section is scrolled into view
    expect(new URL(history.get(), 'http://localhost').hash).toBe('#category-1--sub-%C3%A9');
    await vi.waitFor(() => expect(goToElementMock).toHaveBeenCalledWith('section_category-1--sub-é'));

    // Check the matching desktop ToC option is scrolled into view
    const tocOption = document.getElementById(getToCOptionId('desktop', 'category-1--sub-é'));
    await vi.waitFor(() => expect(scrollIntoViewMock.mock.contexts).toContain(tocOption));
  });

  it('starts a hash link opened from the header at the first section', async () => {
    window.guide = guideFixture;

    const { history } = renderGuide(`${GUIDE_PATH}#category-2`, { state: { from: 'header' } });
    await flushPromises();

    expect(history.get()).toBe(`${GUIDE_PATH}#category-1`);
  });

  it('syncs the mobile ToC open state with the store', async () => {
    const user = userEvent.setup();
    window.guide = guideFixture;

    // Render the guide with the mobile ToC closed
    renderGuide(GUIDE_PATH);
    await flushPromises();
    expect(screen.queryByRole('dialog', { name: 'Index' })).toBeNull();

    // Open the mobile ToC through the store, as the mobile header does
    await user.click(screen.getByRole('button', { name: 'Open ToC from header' }));
    expect(screen.getByRole('dialog', { name: 'Index' })).toBeInTheDocument();

    // Close it from the sidebar and check the store follows
    await user.click(screen.getByRole('button', { name: 'Close sidebar' }));
    expect(screen.queryByRole('dialog', { name: 'Index' })).toBeNull();
    expect(screen.getByText('ToC store: closed')).toBeInTheDocument();
  });
});

// Helpers.

/** Options for `renderGuide`. */
interface RenderGuideOptions {
  /** Guide and ToC already in the guide store, as after a previous visit. */
  cached?: { guide: GuideData; toc: ToCTitle[] };
  /** History state the guide is navigated to with. */
  state?: StateContent;
}

/** Fills the guide store, as a previous visit to the guide does. */
const CachedGuide = (props: { guide: GuideData; toc: ToCTitle[] }) => {
  const setGuide = useSetGuideFileContent();
  const setToc = useSetGuideTOC();
  // Runs while rendering, before the guide mounts
  createRenderEffect(() => {
    setGuide(props.guide);
    setToc(props.toc);
  });
  return null;
};

/** Opens the mobile ToC through the store and shows its state, as the mobile header does. */
const MobileToCStore = () => {
  const openStatus = useMobileTOCStatus();
  const setOpenStatus = useSetMobileTOCStatus();

  return (
    <>
      <button type="button" onClick={() => setOpenStatus(true)}>
        Open ToC from header
      </button>
      <div>ToC store: {openStatus() ? 'open' : 'closed'}</div>
    </>
  );
};

/**
 * Renders the guide at the URL given inside the guide and mobile ToC stores. With a
 * state, it starts at `/` and navigates to the URL with it, as an app link does.
 */
const renderGuide = (url: string, options: RenderGuideOptions = {}) => {
  const history = createMemoryHistory();
  history.set({ value: options.state ? '/' : url });
  let navigate: Navigator | undefined;

  const Root = (props: RouteSectionProps) => {
    navigate = useNavigate();
    return (
      <GuideFileProvider>
        <MobileTOCProvider>
          {options.cached && <CachedGuide guide={options.cached.guide} toc={options.cached.toc} />}
          <MobileToCStore />
          {props.children}
        </MobileTOCProvider>
      </GuideFileProvider>
    );
  };

  const result = render(() => (
    <MemoryRouter history={history} root={Root}>
      <Route path="/" component={() => <div>Explore page</div>} />
      <Route path={GUIDE_PATH} component={Guide} />
    </MemoryRouter>
  ));

  if (options.state) {
    navigate!(url, { state: options.state });
  }

  return { ...result, history };
};
