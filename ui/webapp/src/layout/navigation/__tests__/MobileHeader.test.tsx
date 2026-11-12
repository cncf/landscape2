import { screen } from '@solidjs/testing-library';
import { createTextElement, setViewportWidth } from 'common/test-utils';
import { createSignal } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBaseData } from '../../../test-utils/fixtures';
import { renderWithRouter } from '../../../test-utils/render';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import { MobileTOCProvider } from '../../stores/mobileTOC';
import Header from '../Header';
import MobileHeader from '../MobileHeader';

const [mockScrollY, mockSetScrollY] = createSignal(0);

vi.mock('@solid-primitives/scroll', () => ({
  useWindowScrollPosition: () => ({
    get y() {
      return mockScrollY();
    },
  }),
}));
vi.mock('../../../utils/scrollToTop', () => ({ default: vi.fn() }));
vi.mock('../../common/DownloadDropdown', () => ({ default: () => createTextElement('Download dropdown') }));
vi.mock('../../common/Searchbar', () => ({ default: () => createTextElement('Searchbar') }));
vi.mock('../EmbedModal', () => ({ default: () => createTextElement('Embed modal') }));

const INDEX_BUTTON = { hidden: true, name: 'Open "Table of contents"' };
const INITIAL_VIEWPORT_WIDTH = window.innerWidth;

describe('MobileHeader', () => {
  beforeEach(() => {
    window.baseDS = createBaseData({
      header: { links: { github: 'https://github.com/example/landscape' }, logo: 'images/logo.svg' },
    });
    vi.spyOn(itemsDataGetter, 'getGroups').mockReturnValue(['g1']);
    mockSetScrollY(0);
  });

  afterEach(() => {
    setViewportWidth(INITIAL_VIEWPORT_WIDTH);
  });

  it.each(['/', '/guide'])('shows the Index button on %s', (url) => {
    renderMobileHeader(url);

    expect(screen.getByRole('button', INDEX_BUTTON)).toBeInTheDocument();
  });

  it.each(['/games', '/projects-summary', '/stats'])('hides the Index button on %s', (url) => {
    renderMobileHeader(url);

    expect(screen.queryByRole('button', INDEX_BUTTON)).not.toBeInTheDocument();
  });

  it('renders only one download dropdown next to the desktop header', () => {
    renderWithRouter(() => (
      <MobileTOCProvider>
        <MobileHeader statsVisible />
        <Header statsVisible />
      </MobileTOCProvider>
    ));

    expect(screen.getAllByText('Download dropdown')).toHaveLength(1);
  });

  it('points the logo to the default Explore URL', () => {
    renderMobileHeader('/guide');

    expect(screen.getByRole('link', { name: 'Go to Explore page' })).toHaveAttribute(
      'href',
      '/?group=g1&view-mode=grid'
    );
  });

  it('names the logo images after the landscape', () => {
    renderMobileHeader('/guide');

    // The header and the sticky bar (hidden until it sticks) show the logo
    const logos = screen.getAllByRole('img', { hidden: true, name: 'Landscape logo' });
    expect(logos).toHaveLength(2);
    logos.forEach((logo) => expect(logo).toHaveAttribute('src', './images/logo.svg'));
  });

  it('names the QR code image shown in the screenshot page', () => {
    window.baseDS = createBaseData({ header: { logo: 'images/logo.svg' }, qr_code: 'images/qr_code.svg' });
    renderMobileHeader('/screenshot');

    expect(screen.getByRole('img', { name: 'QR code' })).toHaveAttribute('src', './images/qr_code.svg');
  });

  it('keeps the sticky bar out of the tab order and the accessibility tree until it sticks', () => {
    setViewportWidth(500);
    renderMobileHeader('/');

    // Verify the hidden bar is inert (jsdom does not reflect inert as an attribute, so check the property)
    const bar = screen.getByRole('button', INDEX_BUTTON).closest<HTMLElement>('[aria-hidden]')!;
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    expect(bar.inert).toBe(true);

    // Scroll past the header and verify the sticky bar becomes interactive
    mockSetScrollY(500);
    expect(bar).not.toHaveAttribute('aria-hidden');
    expect(bar.inert).toBe(false);
    expect(screen.getByRole('button', { name: 'Open "Table of contents"' })).toBeInTheDocument();
  });
});

// Helpers.

/** Renders the mobile header at the URL given. */
const renderMobileHeader = (url: string) =>
  renderWithRouter(
    () => (
      <MobileTOCProvider>
        <MobileHeader statsVisible />
      </MobileTOCProvider>
    ),
    { url }
  );
