import { expect, test } from '@playwright/test';

import { waitForGuideData } from './utils/data';
import { gotoExplore, gotoGuide } from './utils/navigation';

test.describe('Guide page', () => {
  test('loads guide content when navigating from the header', async ({ page }) => {
    await gotoExplore(page);
    await Promise.all([waitForGuideData(page), page.getByRole('button', { name: 'Go to "Guide" page' }).click()]);
    await expect(page).toHaveURL(/\/guide/);

    // Guide headings
    await expect(page.getByRole('heading', { name: 'Category 1', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Subcategory 1-1' })).toBeVisible();
  });

  test('loads guide page', async ({ page }) => {
    await gotoGuide(page);

    // Guide headings
    await expect(page.getByRole('heading', { name: 'Category 1', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Subcategory 1-1' })).toBeVisible();
  });
});
