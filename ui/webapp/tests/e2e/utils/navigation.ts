import { Page, type Route } from '@playwright/test';

import baseData from '../data/base.json' assert { type: 'json' };
import fullData from '../data/full.json' assert { type: 'json' };
import guideData from '../data/guide.json' assert { type: 'json' };
import quizData from '../data/quiz.json' assert { type: 'json' };
import statsData from '../data/stats.json' assert { type: 'json' };

const placeholderLogoSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="#ccc"/></svg>';

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
    page.route('**/static/logos/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/svg+xml', body: placeholderLogoSvg })
    ),
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

// Navigate to the guide page (optionally with a hash) after registering routes
export const gotoGuide = async (page: Page, hash?: string) => {
  await registerTemplateRoutes(page);
  const normalizedHash = hash?.startsWith('#') ? hash.slice(1) : hash;
  const target = normalizedHash ? `/guide#${normalizedHash}` : '/guide';
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/static/data/guide.json') && response.ok()),
    page.goto(target),
  ]);
};

// Navigate to the games page, registering template routes beforehand
export const gotoGames = async (page: Page) => {
  await registerTemplateRoutes(page);
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/static/data/quiz.json') && response.ok()),
    page.goto('/games'),
  ]);
};

// Wait for guide data to be loaded
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
