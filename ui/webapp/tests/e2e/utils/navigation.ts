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

// Navigate to the home page, registering template routes beforehand
export const gotoHome = async (page: Page) => {
  await registerTemplateRoutes(page);
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/static/data/base.json') && response.ok()),
    page.goto('/'),
  ]);
};
