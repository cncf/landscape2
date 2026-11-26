import { screen, within } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createBaseData } from '../../../test-utils/fixtures';
import { renderWithRouter } from '../../../test-utils/render';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import overlayData from '../../../utils/overlayData';
import MobileDropdown from '../MobileDropdown';

const OVERLAY_QUERY = 'overlay-data=https%3A%2F%2Fexample.org%2Fdata.yml';

describe('MobileDropdown', () => {
  beforeEach(() => {
    window.baseDS = createBaseData({
      games_available: ['quiz'],
      guide_summary: { Category: ['Subcategory'] },
      header: { links: { github: 'https://github.com/example/landscape' } },
    });
    vi.spyOn(itemsDataGetter, 'getGroups').mockReturnValue(['g1']);
  });

  it('opens a navigation panel controlled by its trigger', async () => {
    const user = userEvent.setup();
    renderWithRouter(() => <MobileDropdown statsVisible />);

    // Verify the closed state of the disclosure
    const trigger = screen.getByRole('button', { name: 'Open navigation menu' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();

    // Open it and verify the trigger controls the visible panel
    await user.click(trigger);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', nav.id);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('keeps the overlay params in the links', async () => {
    const user = userEvent.setup();
    vi.spyOn(overlayData, 'getUrlParams').mockReturnValue(OVERLAY_QUERY);
    renderWithRouter(() => <MobileDropdown statsVisible />, { url: `/stats?${OVERLAY_QUERY}` });

    // Open the menu
    await user.click(screen.getByRole('button', { name: 'Open navigation menu' }));

    // Verify every link keeps the overlay params
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Explore' })).toHaveAttribute(
      'href',
      `/?${OVERLAY_QUERY}&group=g1&view-mode=grid`
    );
    expect(within(nav).getByRole('link', { name: 'Guide' })).toHaveAttribute('href', `/guide?${OVERLAY_QUERY}`);
    expect(within(nav).getByRole('link', { name: 'Stats' })).toHaveAttribute('href', `/stats?${OVERLAY_QUERY}`);
    expect(within(nav).getByRole('link', { name: 'Games' })).toHaveAttribute('href', `/games?${OVERLAY_QUERY}`);
  });

  it('hides the links that are not available', async () => {
    const user = userEvent.setup();
    window.baseDS = createBaseData();
    renderWithRouter(() => <MobileDropdown statsVisible={false} />);

    // Open the menu
    await user.click(screen.getByRole('button', { name: 'Open navigation menu' }));

    // Verify only the Explore link is listed
    const labels = within(screen.getByRole('navigation', { name: 'Main' }))
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(labels).toEqual(['Explore']);
  });

  it.each([
    ['/', 'Explore'],
    ['/embed-setup', 'Explore'],
    ['/guide', 'Guide'],
    ['/stats', 'Stats'],
  ])('marks the active link of %s with aria-current and the active style', async (url, activeLabel) => {
    const user = userEvent.setup();
    renderWithRouter(() => <MobileDropdown statsVisible />, { url });

    // Open the menu
    await user.click(screen.getByRole('button', { name: 'Open navigation menu' }));

    // Verify only the link of the current page is marked
    within(screen.getByRole('navigation', { name: 'Main' }))
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

  it('closes on Escape and returns the focus to the trigger', async () => {
    const user = userEvent.setup();
    renderWithRouter(() => <MobileDropdown statsVisible />);

    // Open the menu and move the focus into it
    const trigger = screen.getByRole('button', { name: 'Open navigation menu' });
    await user.click(trigger);
    screen.getByRole('link', { name: 'Guide' }).focus();

    // Press Escape and verify the menu closes and the trigger gets the focus back
    await user.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes when a link is followed', async () => {
    const user = userEvent.setup();
    const { history } = renderWithRouter(() => <MobileDropdown statsVisible />, { url: '/stats' });

    // Open the menu and follow the Guide link
    await user.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    await user.click(screen.getByRole('link', { name: 'Guide' }));

    // Verify the navigation happened and the menu closed
    expect(history.get()).toBe('/guide');
    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toHaveAttribute('aria-expanded', 'false');
  });
});
