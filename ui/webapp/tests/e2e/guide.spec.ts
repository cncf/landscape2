import { expect, test } from '@playwright/test';

import { gotoExplore, gotoGuide, waitForGuideData } from './utils/navigation';

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

  test('navigates via the table of contents to another category', async ({ page }) => {
    await gotoGuide(page);

    await page.getByRole('button', { name: 'Open Category 2 section' }).click();

    // Verify URL hash and content visibility
    await expect(page).toHaveURL(/#category-2$/);
    await expect(
      page.locator('#section_category-2').getByRole('heading', { level: 1, name: 'Category 2' })
    ).toBeVisible();
  });

  test('loads subcategory content when visiting the guide with a hash', async ({ page }) => {
    await gotoGuide(page, 'category-2--subcategory-2-1');

    await expect(page).toHaveURL(/#category-2--subcategory-2-1$/);

    // Verify subcategory content visibility
    const subcategorySection = page.locator('#section_category-2--subcategory-2-1');
    await expect(subcategorySection.getByRole('heading', { level: 2, name: 'Subcategory 2-1' })).toBeVisible();
  });

  test('loads projects list in guide content', async ({ page }) => {
    await gotoGuide(page);

    // Verify project table and details visibility
    const subcategorySection = page.locator('#section_category-1--subcategory-1-1');
    const projectTable = subcategorySection.getByRole('table').first();
    await expect(projectTable).toContainText('DEMO Projects');
    await expect(projectTable).toContainText('Item 1 (graduated)');
    await expect(projectTable).toContainText('Item 2 (sandbox)');
  });

  test('opens project details modal', async ({ page }) => {
    await gotoGuide(page);

    // Opens project details
    const detailsButton = page.getByRole('button', { name: 'Item 1 info' });
    await detailsButton.click();

    // Open project details modal
    const detailsSection = page.getByLabel('Item details modal');
    await expect(detailsSection).toBeVisible();
    await expect(detailsSection.getByText('Item 1', { exact: true })).toBeVisible();
    await expect(detailsSection.getByText('DEMO', { exact: true })).toBeVisible();
    await expect(detailsSection.getByText('graduated')).toBeVisible();
    await expect(detailsSection.locator('a').filter({ hasText: 'https://github.com/cncf/' })).toBeVisible();
    await expect(detailsSection.getByText('This is the description of item 1')).toBeVisible();
    await expect(detailsSection.getByText('Repositories')).toBeVisible()
    await expect(detailsSection.getByLabel('Repositories select')).toBeVisible();
    await expect(detailsSection.locator('a').filter({ hasText: 'https://github.com/cncf/' })).toBeVisible();
  });
});
