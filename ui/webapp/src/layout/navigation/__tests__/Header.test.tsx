import { fireEvent, screen, within } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createTextElement } from 'common/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createBaseData } from '../../../test-utils/fixtures';
import { renderWithRouter } from '../../../test-utils/render';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import overlayData from '../../../utils/overlayData';
import scrollToTop from '../../../utils/scrollToTop';
import Header from '../Header';

vi.mock('../../../utils/scrollToTop', () => ({ default: vi.fn() }));
vi.mock('../../common/DownloadDropdown', () => ({ default: () => createTextElement('Download dropdown') }));
vi.mock('../../common/Searchbar', () => ({ default: () => createTextElement('Searchbar') }));
vi.mock('../EmbedModal', () => ({ default: () => createTextElement('Embed modal') }));

const GITHUB_URL = 'https://github.com/example/landscape';
const OVERLAY_QUERY = 'overlay-data=https%3A%2F%2Fexample.org%2Fdata.yml';

describe('Header', () => {
  beforeEach(() => {
    window.baseDS = createBaseData({
      games_available: ['quiz'],
      guide_summary: { Category: ['Subcategory'] },
      header: { links: { github: GITHUB_URL }, logo: 'images/logo.svg' },
    });
    vi.spyOn(itemsDataGetter, 'getGroups').mockReturnValue(['g1', 'g2']);
  });

  it('renders the navigation as links inside the main navigation landmark', () => {
    renderWithRouter(() => <Header statsVisible />, { url: '/stats' });

    const nav = screen.getByRole('navigation', { name: 'Main' });
    const labels = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(labels).toEqual(['Explore', 'Guide', 'Stats']);
    expect(within(nav).queryByRole('button')).not.toBeInTheDocument();
  });

  it('points the Explore link and the logo to the default Explore URL', () => {
    renderWithRouter(() => <Header statsVisible />, { url: '/guide' });

    expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute('href', '/?group=g1&view-mode=grid');
    expect(screen.getByRole('link', { name: 'Go to "Explore" page' })).toHaveAttribute(
      'href',
      '/?group=g1&view-mode=grid'
    );
  });

  it('names the logo image after the landscape', () => {
    renderWithRouter(() => <Header statsVisible />, { url: '/guide' });

    expect(screen.getByRole('img', { name: 'Landscape logo' })).toHaveAttribute('src', './images/logo.svg');
  });

  it('names the QR code image shown in the screenshot page', () => {
    window.baseDS = createBaseData({ header: { logo: 'images/logo.svg' }, qr_code: 'images/qr_code.svg' });
    renderWithRouter(() => <Header statsVisible />, { url: '/screenshot' });

    expect(screen.getByRole('img', { name: 'QR code' })).toHaveAttribute('src', './images/qr_code.svg');
  });

  it('leaves the group out of the default Explore URL in a landscape without groups', () => {
    vi.mocked(itemsDataGetter.getGroups).mockReturnValue(undefined);
    renderWithRouter(() => <Header statsVisible />, { url: '/guide' });

    expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute('href', '/?view-mode=grid');
  });

  it('keeps the overlay params in every link in overlay mode', () => {
    vi.spyOn(overlayData, 'getUrlParams').mockReturnValue(OVERLAY_QUERY);
    renderWithRouter(() => <Header statsVisible />, { url: `/guide?${OVERLAY_QUERY}` });

    expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute(
      'href',
      `/?${OVERLAY_QUERY}&group=g1&view-mode=grid`
    );
    expect(screen.getByRole('link', { name: 'Go to "Explore" page' })).toHaveAttribute(
      'href',
      `/?${OVERLAY_QUERY}&group=g1&view-mode=grid`
    );
    expect(screen.getByRole('link', { name: 'Guide' })).toHaveAttribute('href', `/guide?${OVERLAY_QUERY}`);
    expect(screen.getByRole('link', { name: 'Stats' })).toHaveAttribute('href', `/stats?${OVERLAY_QUERY}`);
    expect(screen.getByRole('link', { name: 'Games' })).toHaveAttribute('href', `/games?${OVERLAY_QUERY}`);
  });

  it('shows the Guide, Stats, Games and GitHub links when they are available', () => {
    renderWithRouter(() => <Header statsVisible />);

    expect(screen.getByRole('link', { name: 'Guide' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Stats' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Games' })).toHaveAttribute('href', '/games');
    expect(screen.getByRole('link', { name: 'GitHub repository' })).toHaveAttribute('href', GITHUB_URL);
  });

  it('hides the Guide, Stats, Games and GitHub links when they are not available', () => {
    window.baseDS = createBaseData({ guide_summary: {}, header: { logo: 'images/logo.svg' } });
    renderWithRouter(() => <Header statsVisible={false} />);

    expect(screen.getByRole('link', { name: 'Explore' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Guide' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Stats' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Games' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'GitHub repository' })).not.toBeInTheDocument();
  });

  it('scrolls to the top and drops the section when the link of the current page is clicked', async () => {
    // Setup: the guide opened at a section from another page
    const user = userEvent.setup();
    const { history } = renderWithRouter(() => <Header statsVisible />, { url: '/stats' });
    history.set({ value: '/guide?overlay-data=x#category--subcategory' });

    // Run
    await user.click(screen.getByRole('link', { name: 'Guide' }));

    // Check: the URL drops the section, keeping the params, and no history entry is added
    expect(scrollToTop).toHaveBeenCalledWith(false);
    expect(history.get()).toBe('/guide?overlay-data=x');
    history.back();
    expect(history.get()).toBe('/stats');
  });

  it('only scrolls to the top when the link of the current page without a section is clicked', async () => {
    // Setup: the guide opened from another page
    const user = userEvent.setup();
    const { history } = renderWithRouter(() => <Header statsVisible />, { url: '/stats' });
    history.set({ value: '/guide' });

    // Run
    await user.click(screen.getByRole('link', { name: 'Guide' }));

    // Check: the URL is kept and no history entry is added
    expect(scrollToTop).toHaveBeenCalledWith(false);
    expect(history.get()).toBe('/guide');
    history.back();
    expect(history.get()).toBe('/stats');
  });

  it('lets the browser open the link of the current page in a new tab', () => {
    renderWithRouter(() => <Header statsVisible />, { url: '/guide#category--subcategory' });

    // fireEvent returns false when the default action was prevented
    expect(fireEvent.click(screen.getByRole('link', { name: 'Guide' }), { ctrlKey: true })).toBe(true);
  });

  it.each([
    ['/', 'Explore'],
    ['/embed-setup', 'Explore'],
    ['/guide', 'Guide'],
    ['/stats', 'Stats'],
  ])('marks the active link of %s with aria-current and the active style', (url, activeLabel) => {
    renderWithRouter(() => <Header statsVisible />, { url });

    const nav = screen.getByRole('navigation', { name: 'Main' });
    within(nav)
      .getAllByRole('link')
      .forEach((link) => {
        if (link.textContent === activeLabel) {
          expect(link).toHaveAttribute('aria-current', 'page');
          expect(link).toHaveClass('activeLink');
        } else {
          expect(link).not.toHaveAttribute('aria-current');
          expect(link).not.toHaveClass('activeLink');
        }
      });
  });
});
