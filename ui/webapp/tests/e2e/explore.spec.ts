import { expect, test } from '@playwright/test';

import { gotoExplore } from './utils/navigation';

test.describe('Explore page', () => {
  test('shows navigation and footer content', async ({ page }) => {
    await gotoExplore(page);

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

  test('loads groups and categories', async ({ page }) => {
    await gotoExplore(page);

    // Groups
    await expect(page.getByRole('button', { name: 'Some categories' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Only category 2' })).toBeVisible();

    // Categories and subcategories
    await expect(page.getByText(/^Category 1/).first()).toBeVisible();
    await expect(page.getByText(/^Category 2/).first()).toBeVisible();
    await expect(page.getByText(/^Subcategory 1-1/).first()).toBeVisible();
    await expect(page.getByText(/^Subcategory 1-2/).first()).toBeVisible();
    await expect(page.getByText(/^Subcategory 2-1/).first()).toBeVisible();
    await expect(page.getByText(/^Subcategory 2-2/).first()).toBeVisible();
  });

  test('opens second group', async ({ page }) => {
    await gotoExplore(page);

    // Clicks on second group
    const firstGroupButton = page.getByRole('button', { name: 'Some categories' });
    const secondGroupButton = page.getByRole('button', { name: 'Only category 2' });
    await secondGroupButton.click();

    // Second group is active and first one becomes inactive
    await expect(secondGroupButton).toHaveClass(/active/);
    await expect(firstGroupButton).not.toHaveClass(/active/);
  });

  test('adds filters', async ({ page }) => {
    await gotoExplore(page);

    // Opens filter modal
    const filterButton = page.getByRole('button', { name: 'Open Filters' });
    await filterButton.click();

    // Expects filter modal to be visible
    const filterModal = page.getByLabel('Filters modal');
    await expect(filterModal).toBeVisible();
    await expect(filterModal.locator('div').filter({ hasText: /^Filters$/ }).nth(1)).toBeVisible();
    await expect(filterModal.getByText('Project', { exact: true })).toBeVisible();
    await expect(filterModal.getByLabel('Close')).toBeVisible();

    // Adds a filter
    const filterOption = filterModal.getByLabel('Category 1', { exact: true });
    await filterOption.check();
    await expect(filterOption).toBeChecked();

    // Applies the filter
    const applyButton = filterModal.getByLabel('Apply filters');
    await applyButton.click();
    await expect(filterModal).not.toBeVisible();

    // Expects filter to be applied
    const activeFilter = page.getByRole('listitem').filter({ hasText: 'category:Category 1Clear icon' });
    await expect(activeFilter).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Category 1 filter' })).toBeVisible();
  });

  test('removes filters', async ({ page }) => {
    await gotoExplore(page, '?category=Category%201');

    // Loads with filter applied
    const activeFilter = page.getByRole('listitem').filter({ hasText: 'category:Category 1Clear icon' });
    await expect(activeFilter).toBeVisible();

    // Removes the filter
    const removeFilterButton = page.getByRole('button', { name: 'Remove Category 1 filter' });
    await removeFilterButton.click();

    // Expects filter to be removed
    await expect(activeFilter).not.toBeVisible();
  });

  test('shows no projects message when filters yield no results', async ({ page }) => {
    // Loads with filter that yields no results (Category 3 does not exist)
    await gotoExplore(page, '?category=Category%203');

    // Loads with filter applied
    const activeFilter = page.getByRole('listitem').filter({ hasText: 'category:Category 3Clear icon' });
    await expect(activeFilter).toBeVisible();

    // Expects no projects message to be visible
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert.getByText('We couldn\'t find any items that match the criteria selected.')).toBeVisible();
    await expect(alert.getByRole('button', { name: 'Reset filters' })).toBeVisible();
  });

  test('resets filters from no projects message', async ({ page }) => {
    // Loads with filter that yields no results (Category 3 does not exist)
    await gotoExplore(page, '?category=Category%203');

    // Expects no projects message to be visible
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();

    // Resets filters
    const resetButton = alert.getByRole('button', { name: 'Reset filters' });
    await resetButton.click();

    // Expects no projects message to be gone and filter to be removed
    await expect(alert).not.toBeVisible();
    const activeFilter = page.getByRole('listitem').filter({ hasText: 'category:Category 3Clear icon' });
    await expect(activeFilter).not.toBeVisible();
  });

  test('shows and hides project details', async ({ page }) => {
    await gotoExplore(page);

    // Opens project details
    const detailsButton = page.getByRole('button', { name: 'Item 1 info' });
    await detailsButton.click();

    // Expects project details content to be visible
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

    // Closes project details
    const hideDetailsButton = detailsSection.getByLabel('Close');
    await hideDetailsButton.click();
    await expect(detailsSection).not.toBeVisible();
  });

  test('displays project dropdown', async ({ page }) => {
    await gotoExplore(page);

    // Displays project dropdown
    const detailsButton = page.getByRole('button', { name: 'Item 1 info' });
    await detailsButton.hover();
    await page.waitForTimeout(2000); // Wait for the dropdown to appear

    // Expects project dropdown to be visible
    const dropdown = page.getByRole('complementary');
    await expect(dropdown).toBeVisible();
    await expect(dropdown.locator('img[alt="Item 1 logo"]')).toBeVisible();
    await expect(dropdown.getByText('Item 1', { exact: true })).toBeVisible();
    await expect(dropdown.getByText('DEMO', { exact: true })).toBeVisible();
    await expect(dropdown.getByText('graduated')).toBeVisible();
    await expect(dropdown.getByText('This is the description of item 1')).toBeVisible();
  });

  test('displays embeddable view setup modal', async ({ page }) => {
    await gotoExplore(page);

    // Opens embeddable view setup modal
    const embedButton = page.getByRole('button', { name: 'Open "Embeddable view setup"' });
    await embedButton.click();

    // Expects embeddable view setup modal to be visible
    const embedModal = page.getByLabel('Embeddable view setup modal');
    await expect(embedModal).toBeVisible();
    await expect(embedModal.getByText('Embeddable view setup', { exact: true })).toBeVisible();
    await expect(embedModal.getByText('Embed code')).toBeVisible();
    await expect(embedModal.getByLabel('Classification options')).toBeVisible();
    await expect(embedModal.getByLabel('Categories list', { exact: true })).toBeVisible();
    await expect(embedModal.getByLabel('Subcategories list')).toBeVisible();
    await expect(embedModal.getByLabel('Copy code to clipboard')).toBeVisible();

    // Closes embeddable view setup modal
    const closeButton = embedModal.getByLabel('Close modal');
    await closeButton.click();
    await expect(embedModal).not.toBeVisible();
  });

  test('downloads landscape image', async ({ page }) => {
    await gotoExplore(page);

    // Clicks on download image button
    const downloadButton = page.getByRole('button', { name: 'Open dropdown' })
    await downloadButton.click();

    // Expects download to be open
    const dropdown = page.getByRole('complementary')
    await expect(dropdown).toBeVisible();
    await expect(dropdown.getByRole('button', { name: 'Download landscape in PDF' })).toBeVisible();
    await expect(dropdown.getByRole('button', { name: 'Download landscape in PNG' })).toBeVisible();
    await expect(dropdown.getByRole('button', { name: 'Download items in CSV format' })).toBeVisible();
    await expect(dropdown.getByRole('button', { name: 'Download projects in CSV' })).toBeVisible();

    // Downloads landscape PNG
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      dropdown.getByRole('button', { name: 'Download landscape in PNG' }).click(),
    ]);

    // Expects download to have correct filename
    expect(download.suggestedFilename()).toBe('landscape.png');
  });
});
