import { expect, test } from '@playwright/test';

import { waitForGuideData } from './utils/data';
import { gotoHome } from './utils/navigation';

test.describe('home page', () => {
  test('shows navigation and footer content', async ({ page }) => {
    await gotoHome(page);

    // Navigation bar
    await expect(page.getByRole('button', { name: 'Go to "Explore" page' }).first()).toBeVisible();
    await expect(page.getByRole('banner').getByText('Explore')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to "Guide" page' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to "Stats" page' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open "Embeddable view setup"' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open Dropdown' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to "Games" page' })).toBeVisible();
    await expect(page.getByRole('banner').getByRole('link', { name: 'Open external link' })).toHaveAttribute(
      'href',
      'https://github.com/cncf/landscape2'
    );

    // Footer
    await expect(page.getByRole('contentinfo')).toContainText('CNCF interactive landscapes generator');
    await expect(page.getByRole('contentinfo')).toContainText('Privacy Policy');
    await expect(page.getByRole('contentinfo')).toContainText('Terms of Use');
  });

  test('navigates to stats view from the header', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: 'Go to "Stats" page' }).click();
    await expect(page).toHaveURL(/\/stats$/);

    // Subtitles in stats page
    await expect(page.getByText('Distribution by maturity')).toBeVisible();
    await expect(page.getByText('Accepted over time')).toBeVisible();
    await expect(page.getByText('Promotions')).toBeVisible();
    await expect(page.getByText('Security audits')).toBeVisible();
    await expect(page.getByText('Distribution by category, subcategory and TAG')).toBeVisible();
    await expect(page.getByText('Distribution by category', { exact: true })).toBeVisible();
    await expect(page.getByText('Memberships over time')).toBeVisible();
    await expect(page.getByText('Most popular languages')).toBeVisible();
    await expect(page.getByText('Activity')).toBeVisible();
    await expect(page.getByText('Licenses')).toBeVisible();
    await expect(page.getByText('Funding rounds', { exact: true })).toBeVisible();
    await expect(page.getByText('Acquisitions', { exact: true })).toBeVisible();
  });

  test('loads guide content when navigating from the header', async ({ page }) => {
    await gotoHome(page);
    await Promise.all([waitForGuideData(page), page.getByRole('button', { name: 'Go to "Guide" page' }).click()]);
    await expect(page).toHaveURL(/\/guide/);

    // Guide headings
    await expect(page.getByRole('heading', { name: 'Category 1', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Subcategory 1-1' })).toBeVisible();
  });
});
