import { expect, test } from '@playwright/test';

import { gotoExplore, gotoStats } from './utils/navigation';

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

  test('toggles category distribution rows', async ({ page }) => {
    await gotoStats(page);

    const categoryTable = page.getByRole('treegrid');
    const categoryOneRow = categoryTable.locator('tbody tr').filter({ hasText: 'Category 1' }).first();
    const categoryTwoRow = categoryTable.locator('tbody tr').filter({ hasText: 'Category 2' }).first();

    await expect(categoryTable.getByText('Subcategory 1-1')).toBeVisible();
    await expect(categoryTable.getByText('Subcategory 2-1')).not.toBeVisible();

    // Collapse and expand category rows
    await categoryOneRow.click();
    await expect(categoryTable.getByText('Subcategory 1-1')).not.toBeVisible();
    await categoryTwoRow.click();
    await expect(categoryTable.getByText('Subcategory 2-1')).toBeVisible();
  });

  test('lists repository licenses with counts and percentages', async ({ page }) => {
    await gotoStats(page);

    // Verify licenses table and details visibility
    const licensesTable = page.locator('table').filter({ hasText: 'License' }).first();
    const apacheRow = licensesTable.getByRole('row', { name: /Apache-2\.0/ });

    await expect(apacheRow).toContainText('4');
    await expect(apacheRow).toContainText('100.00%');
  });
});
