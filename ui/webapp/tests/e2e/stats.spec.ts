import { expect, test } from '@playwright/test';

import { gotoExplore } from './utils/navigation';

test.describe('Stats page', () => {
  test('navigates to stats view from the header', async ({ page }) => {
    await gotoExplore(page);
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
});
