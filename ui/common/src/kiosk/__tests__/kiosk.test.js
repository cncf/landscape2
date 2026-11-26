import { readFileSync } from 'node:fs';
import path from 'node:path';

import { render } from '@solidjs/testing-library';
import { within } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildSections,
  escapeHtml,
  formatDate,
  formatNumber,
  getGitHubRepoPath,
  getPrimaryRepository,
  loadProject,
  renderProject,
  renderStatus,
  sanitizeUrl,
} from '../../../../kiosk/kiosk.js';
import {
  Blog,
  Bluesky,
  Discord,
  Discussions,
  GitHub,
  Link,
  LinkedIn,
  MailingList,
  Reddit,
  Slack,
  StackOverflow,
  Twitter,
  World,
  Youtube,
} from '../../components/icons';

// Project with a value for every link of the sections
const ALL_LINKS_PROJECT = {
  blog_url: 'https://blog.item.example',
  bluesky_url: 'https://bsky.app/profile/item',
  discord_url: 'https://discord.gg/item',
  github_discussions_url: 'https://github.com/a/b/discussions',
  linkedin_url: 'https://www.linkedin.com/company/item',
  mailing_list_url: 'https://lists.item.example',
  reddit_url: 'https://www.reddit.com/r/item',
  repositories: [{ primary: true, url: 'https://github.com/a/b' }],
  slack_url: 'https://item.slack.com',
  stack_overflow_url: 'https://stackoverflow.com/questions/tagged/item',
  summary: { intro_url: 'https://item.example/intro' },
  twitter_url: 'https://twitter.com/item',
  youtube_url: 'https://www.youtube.com/item',
};

const CONFIG = { foundation: 'CNCF', url: 'https://landscape.example' };

// Common icon component drawing each sprite icon shared with common
const COMMON_ICONS = {
  blog: Blog,
  bluesky: Bluesky,
  discord: Discord,
  discussions: Discussions,
  github: GitHub,
  link: Link,
  linkedin: LinkedIn,
  mailing: MailingList,
  reddit: Reddit,
  slack: Slack,
  stackoverflow: StackOverflow,
  twitter: Twitter,
  world: World,
  youtube: Youtube,
};

const GOOD_FIRST_ISSUES_QUERY = 'issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22';
const KIOSK_DIR = path.resolve(import.meta.dirname, '../../../../kiosk');

// Sprite icons that common has no component for
const KIOSK_ONLY_ICONS = ['goodfirstissues'];

describe('sanitizeUrl', () => {
  it('rejects javascript and data urls, and empty input', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('data:text/html,<b>x</b>')).toBe('');
    expect(sanitizeUrl('')).toBe('');
    expect(sanitizeUrl('   ')).toBe('');
    expect(sanitizeUrl(undefined)).toBe('');
  });

  it('keeps http, https, mailto and tel urls', () => {
    expect(sanitizeUrl('http://item.example/')).toBe('http://item.example/');
    expect(sanitizeUrl(' https://item.example/docs ')).toBe('https://item.example/docs');
    expect(sanitizeUrl('mailto:dev@item.example')).toBe('mailto:dev@item.example');
    expect(sanitizeUrl('tel:+123')).toBe('tel:+123');
  });
});

describe('escapeHtml', () => {
  it('escapes the five HTML special characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });

  it('returns an empty string for null and undefined, and stringifies other values', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(0)).toBe('0');
  });
});

describe('formatNumber', () => {
  it('rounds to the next unit at the k and M thresholds', () => {
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(999.5)).toBe('1k');
    expect(formatNumber(999500)).toBe('1M');
    expect(formatNumber(10000000)).toBe('10M');
  });

  it('returns an empty string for values that are not numbers', () => {
    expect(formatNumber('12')).toBe('');
    expect(formatNumber(Number.NaN)).toBe('');
  });
});

describe('formatDate', () => {
  it('returns the raw text of a value that is not a date', () => {
    expect(formatDate('not a date')).toBe('not a date');
  });

  it('formats a date in UTC and returns an empty string without a value', () => {
    expect(formatDate('2024-03-05T23:30:00Z')).toContain('2024');
    expect(formatDate('')).toBe('');
  });
});

describe('getGitHubRepoPath', () => {
  it('returns the owner and name of a GitHub repository url, ignoring a trailing slash', () => {
    expect(getGitHubRepoPath('https://github.com/a/b')).toBe('a/b');
    expect(getGitHubRepoPath('https://github.com/a/b/')).toBe('a/b');
  });

  it('returns null for repositories hosted elsewhere and for non-repository urls', () => {
    expect(getGitHubRepoPath('https://gitlab.com/a/b')).toBeNull();
    expect(getGitHubRepoPath('https://github.com/a')).toBeNull();
    expect(getGitHubRepoPath('https://notgithub.com/a/b')).toBeNull();
    expect(getGitHubRepoPath(undefined)).toBeNull();
  });
});

describe('getPrimaryRepository', () => {
  it('prefers the repository flagged as primary', () => {
    const primary = { primary: true, url: 'https://github.com/a/primary' };

    expect(getPrimaryRepository({ repositories: [{ url: 'https://github.com/a/other' }, primary] })).toBe(primary);
  });

  it('falls back to the first repository, or null without repositories', () => {
    const first = { url: 'https://github.com/a/first' };

    expect(getPrimaryRepository({ repositories: [first, { url: 'https://github.com/a/second' }] })).toBe(first);
    expect(getPrimaryRepository({})).toBeNull();
  });
});

describe('buildSections', () => {
  it('drops the links without a safe url and the sections left empty', () => {
    const sections = buildSections({ twitter_url: 'javascript:alert(1)', website: 'https://item.example' }, null);

    expect(sections).toEqual([
      { title: 'Get Started', links: [{ icon: 'world', label: 'Website', url: 'https://item.example/' }] },
    ]);
  });

  it('links the good first issues of a GitHub repository whose url ends in a slash', () => {
    const repository = { primary: true, url: 'https://github.com/a/b/' };

    const contribute = getSection(buildSections({ repositories: [repository] }, repository), 'Contribute');

    expect(contribute.links).toEqual([
      { icon: 'github', label: 'Repository', url: 'https://github.com/a/b/' },
      { icon: 'goodfirstissues', label: 'Good first issues', url: `https://github.com/a/b/${GOOD_FIRST_ISSUES_QUERY}` },
    ]);
  });

  it('gives a GitLab repository a link icon and no good first issues link', () => {
    const repository = { primary: true, url: 'https://gitlab.com/a/b' };

    const contribute = getSection(buildSections({ repositories: [repository] }, repository), 'Contribute');

    expect(contribute.links).toEqual([{ icon: 'link', label: 'Repository', url: 'https://gitlab.com/a/b' }]);
  });

  it('omits the good first issues link of an archived project', () => {
    const repository = { primary: true, url: 'https://github.com/a/b' };

    const contribute = getSection(
      buildSections({ maturity: 'archived', repositories: [repository] }, repository),
      'Contribute'
    );

    expect(contribute.links.map((link) => link.label)).toEqual(['Repository']);
  });
});

describe('renderProject', () => {
  let root;

  beforeEach(() => {
    root = createRoot();
  });

  afterEach(() => {
    root.remove();
  });

  it('shows the API description as it is', () => {
    const description = 'Item <b>description</b> & more :rocket:';

    renderProject(root, createProject({ description }), CONFIG);

    expect(root.querySelector('.description')).toHaveTextContent(description, { normalizeWhitespace: false });
  });

  it('omits the description paragraph when the API item has no description', () => {
    renderProject(root, createProject({ summary: { use_case: 'Use case text' } }), CONFIG);

    expect(root.querySelector('.description')).toBeNull();
    expect(within(root).queryByText('Use case text')).not.toBeInTheDocument();
  });

  it('shows a stat value that is not a date escaped once', () => {
    const repository = { latest_release: 'a & b', license: '<MIT>', primary: true, url: 'https://github.com/a/b' };

    renderProject(root, createProject({ repositories: [repository] }), CONFIG);

    expect(getStatValue(root, 'Latest release')).toHaveTextContent('a & b');
    expect(getStatValue(root, 'License')).toHaveTextContent('<MIT>');
    expect(root.innerHTML).not.toContain('&amp;amp;');
  });

  it('shows a link icon and no good first issues link for a GitLab repository', () => {
    const repository = { primary: true, url: 'https://gitlab.com/a/b' };

    renderProject(root, createProject({ repositories: [repository] }), CONFIG);

    const repositoryLink = within(root).getByRole('link', { name: 'Repository' });
    expect(repositoryLink).toHaveAttribute('href', 'https://gitlab.com/a/b');
    expect(repositoryLink.querySelector('use')).toHaveAttribute('href', '#icon-link');
    expect(within(root).queryByRole('link', { name: 'Good first issues' })).not.toBeInTheDocument();
  });

  it('sets the page title, and only references icons of the sprite', () => {
    // Render a project with every link
    renderProject(root, createProject(ALL_LINKS_PROJECT), CONFIG);

    // Check the title and that every icon is in the sprite
    expect(document.title).toBe('Item A | CNCF Landscape');
    const spriteIds = getSpriteSymbols().map((symbol) => symbol.id);
    const iconIds = [...root.querySelectorAll('use')].map((use) => use.getAttribute('href').slice(1));
    expect(iconIds).toHaveLength(15);
    for (const iconId of iconIds) {
      expect(spriteIds).toContain(iconId);
    }
  });
});

describe('renderStatus', () => {
  let root;

  beforeEach(() => {
    root = createRoot();
  });

  afterEach(() => {
    root.remove();
  });

  it('puts the title and message in a status region updated in place', () => {
    // Render the loading status
    renderStatus(root, { loading: true, message: 'Fetching.', title: 'Loading project' });
    const status = within(root).getByRole('status');
    expect(status).toHaveTextContent('Loading project Fetching.');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(root.querySelector('.spinner')).toBeVisible();
    expect(within(root).queryByRole('link')).not.toBeInTheDocument();

    // Render the no data status and check it reuses the status region
    renderStatus(root, { actionLabel: 'Browse', actionUrl: CONFIG.url, message: 'Missing.', title: 'No data' });
    expect(within(root).getByRole('status')).toBe(status);
    expect(status).toHaveTextContent('No data Missing.');
    expect(root.querySelector('.spinner')).not.toBeVisible();
    expect(within(root).getByRole('link', { name: 'Browse' })).toHaveAttribute('href', 'https://landscape.example/');
  });
});

describe('loadProject', () => {
  let initialUrl;
  let root;

  beforeEach(() => {
    initialUrl = window.location.href;
    root = createRoot();
  });

  afterEach(() => {
    root.remove();
    window.history.replaceState(null, '', initialUrl);
  });

  it('asks for an item when the page url has none', async () => {
    const fetchFn = vi.fn();
    window.history.replaceState(null, '', '/kiosk.html');

    await loadProject(root, CONFIG, fetchFn);

    expect(fetchFn).not.toHaveBeenCalled();
    expectNoDataStatus(root, 'Add an item query parameter to load a project from the landscape.');
  });

  it('loads the project from the API, showing the loading status meanwhile', async () => {
    // Request an item and keep its response pending
    let resolveResponse;
    const fetchFn = vi.fn(() => new Promise((resolve) => (resolveResponse = resolve)));
    window.history.replaceState(null, '', '/landscape/kiosk.html?item=item-a');
    const loading = loadProject(root, CONFIG, fetchFn);
    expect(within(root).getByRole('status')).toHaveTextContent('Loading project');

    // Resolve the response and check the project is shown
    resolveResponse(jsonResponse(createProject()));
    await loading;
    expect(fetchFn).toHaveBeenCalledExactlyOnceWith(`${window.location.origin}/landscape/api/projects/item-a.json`, {
      headers: { Accept: 'application/json' },
    });
    expect(within(root).getByRole('heading', { level: 1 })).toHaveTextContent('Item A');
  });

  it('shows no data when the API response is not ok', async () => {
    window.history.replaceState(null, '', '/kiosk.html?item=item-a');

    await loadProject(root, CONFIG, vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    expectNoDataStatus(root, 'We could not find project data for the requested item.');
  });

  it('shows no data when the API payload has no id', async () => {
    window.history.replaceState(null, '', '/kiosk.html?item=item-a');

    await loadProject(root, CONFIG, vi.fn().mockResolvedValue(jsonResponse({ name: 'Item A' })));

    expectNoDataStatus(root, 'The project response did not include usable data.');
  });

  it('shows no data when the fetch fails', async () => {
    window.history.replaceState(null, '', '/kiosk.html?item=item-a');

    await loadProject(root, CONFIG, vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    expectNoDataStatus(root, 'Something went wrong while loading project data.');
  });
});

describe('kiosk.html', () => {
  it('has no live region on <main>, whose whole content is replaced', () => {
    const main = parseKioskHtml().querySelector('main');

    // The parsed document has no window, so the DOM matchers cannot check its elements
    expect(main.id).toBe('app');
    expect(main.hasAttribute('aria-live')).toBe(false);
  });

  it('draws every sprite icon shared with common like the common component', () => {
    const symbols = getSpriteSymbols();

    // Check every sprite icon is either shared with common or known to be kiosk-only
    expect(symbols.map((symbol) => symbol.id.replace('icon-', '')).sort()).toEqual(
      [...Object.keys(COMMON_ICONS), ...KIOSK_ONLY_ICONS].sort()
    );

    // Check each shared icon has the view box and paths of its common component
    for (const symbol of symbols) {
      const name = symbol.id.replace('icon-', '');
      if (KIOSK_ONLY_ICONS.includes(name)) continue;

      const { container, unmount } = render(() => COMMON_ICONS[name]({}));
      const svg = container.querySelector('svg');
      expect(symbol.getAttribute('viewBox'), name).toBe(svg.getAttribute('viewBox'));
      expect(getPathData(symbol), name).toEqual(getPathData(svg));
      unmount();
    }
  });
});

describe('kiosk.js', () => {
  it('contains no Askama delimiters, as kiosk.html includes it as a template', () => {
    const source = readFileSync(path.join(KIOSK_DIR, 'kiosk.js'), 'utf8');

    expect(source).not.toMatch(/\{\{|\{%|\{#/);
  });
});

// Helpers.

/** Creates an API project with the given fields. */
const createProject = (overrides = {}) => ({
  id: 'item-a',
  name: 'Item A',
  website: 'https://item.example',
  ...overrides,
});

/** Creates the element the kiosk renders into. */
const createRoot = () => {
  const root = document.createElement('main');
  document.body.append(root);
  return root;
};

/** Checks the no data status card shows the given message and links to the landscape. */
const expectNoDataStatus = (root, message) => {
  const status = within(root).getByRole('status');
  expect(within(status).getByRole('heading', { level: 1 })).toHaveTextContent('No data available');
  expect(status).toHaveTextContent(message);
  expect(within(root).getByRole('link', { name: 'Browse the landscape' })).toHaveAttribute(
    'href',
    'https://landscape.example/'
  );
};

/** Returns the `d` attribute of every path of an SVG element. */
const getPathData = (element) =>
  [...element.querySelectorAll('path')].map((pathElement) => pathElement.getAttribute('d'));

/** Returns the section with the given title. */
const getSection = (sections, title) => sections.find((section) => section.title === title);

/** Returns the symbols of the kiosk.html sprite. */
const getSpriteSymbols = () => [...parseKioskHtml().querySelectorAll('svg > symbol')];

/** Returns the value element of the stat with the given label. */
const getStatValue = (root, label) =>
  [...root.querySelectorAll('.stat-pill')]
    .find((pill) => pill.querySelector('.stat-label').textContent === label)
    .querySelector('.stat-value');

/** Creates a successful JSON response with the given body. */
const jsonResponse = (body) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' }, status: 200 });

/** Parses the kiosk.html template. */
const parseKioskHtml = () =>
  new DOMParser().parseFromString(readFileSync(path.join(KIOSK_DIR, 'kiosk.html'), 'utf8'), 'text/html');
