import { expect, test } from '@playwright/test';

import { waitForGuideData } from './utils/data';
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
});
