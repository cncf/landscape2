import { Page } from '@playwright/test';

export const waitForGuideData = async (page: Page) => {
  await page.waitForResponse((response) => {
    if (!response.url().includes('/static/data/guide.json')) {
      return false;
    }
    const request = response.request();
    if (request.method() !== 'GET') {
      return false;
    }
    return response.ok();
  });
};
