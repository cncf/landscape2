import { Page, type Route } from '@playwright/test';

import baseData from '../data/base.json' assert { type: 'json' };
import fullData from '../data/full.json' assert { type: 'json' };
import guideData from '../data/guide.json' assert { type: 'json' };
import quizData from '../data/quiz.json' assert { type: 'json' };
import statsData from '../data/stats.json' assert { type: 'json' };

const registeredPages = new WeakSet<Page>();

const fixtures = {
  base: baseData,
  full: fullData,
  guide: guideData,
  quiz: quizData,
  stats: statsData,
};

// Helper to fulfill a route with JSON data
const fulfillJson = (route: Route, data: unknown) => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(data),
  });
};

// Register routes to serve template data fixtures
const registerTemplateRoutes = async (page: Page) => {
  if (registeredPages.has(page)) {
    return;
  }
  registeredPages.add(page);

  await Promise.all([
    page.route('**/static/data/base.json', (route) => fulfillJson(route, fixtures.base)),
    page.route('**/static/data/stats.json', (route) => fulfillJson(route, fixtures.stats)),
    page.route('**/static/data/guide.json', (route) => fulfillJson(route, fixtures.guide)),
    page.route('**/static/data/full.json', (route) => fulfillJson(route, fixtures.full)),
    page.route('**/static/data/quiz.json', (route) => fulfillJson(route, fixtures.quiz)),
  ]);
};

// Navigate to the explore page, registering template routes beforehand
export const gotoExplore = async (page: Page, query?: string) => {
  await registerTemplateRoutes(page);
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/static/data/base.json') && response.ok()),
    page.goto(`/${query || ''}`),
  ]);
};

// Navigate to the stats page, registering template routes beforehand
export const gotoStats = async (page: Page) => {
  await registerTemplateRoutes(page);
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/static/data/stats.json') && response.ok()),
    page.goto('/stats'),
  ]);
};

// Navigate to the guide page, registering template routes beforehand
export const gotoGuide = async (page: Page) => {
  await registerTemplateRoutes(page);
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/static/data/guide.json') && response.ok()),
    page.goto('/guide'),
  ]);
};

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
