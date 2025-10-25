import { Page } from '@playwright/test';

export const gotoHome = async (page: Page) => {
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/static/data/base.json') && response.ok()),
    page.goto('/'),
  ]);
};
