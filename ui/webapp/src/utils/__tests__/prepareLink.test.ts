import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createBaseData } from '../../test-utils/fixtures';

const { mockGetUrlParams } = vi.hoisted(() => ({ mockGetUrlParams: vi.fn<() => string>() }));

vi.mock('../overlayData', () => ({ default: { getUrlParams: mockGetUrlParams } }));

const OVERLAY_QUERY = 'overlay-data=https%3A%2F%2Fexample.org%2Fdata.yml';

describe('prepareLink', () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetUrlParams.mockReturnValue('');
  });

  it.each([
    ['no base path', '', '/', '/stats'],
    ['a base path', '/landscape', '/landscape/', '/landscape/stats'],
  ])('returns the bare path without overlay nor extra query under %s', async (_, basePath, explorePath, statsPath) => {
    const { EXPLORE_PATH, prepareLink, STATS_PATH } = await loadModules(basePath);

    expect(prepareLink(EXPLORE_PATH)).toBe(explorePath);
    expect(prepareLink(STATS_PATH)).toBe(statsPath);
  });

  it.each([
    ['no base path', '', '/?group=g1&view-mode=card'],
    ['a base path', '/landscape', '/landscape/?group=g1&view-mode=card'],
  ])('appends the extra query without overlay under %s', async (_, basePath, expected) => {
    const { EXPLORE_PATH, prepareLink } = await loadModules(basePath);

    expect(prepareLink(EXPLORE_PATH, 'group=g1&view-mode=card')).toBe(expected);
  });

  it.each([
    ['no base path', '', `/?${OVERLAY_QUERY}`, `/guide?${OVERLAY_QUERY}`],
    ['a base path', '/landscape', `/landscape/?${OVERLAY_QUERY}`, `/landscape/guide?${OVERLAY_QUERY}`],
  ])('keeps the overlay params without extra query under %s', async (_, basePath, explorePath, guidePath) => {
    mockGetUrlParams.mockReturnValue(OVERLAY_QUERY);
    const { EXPLORE_PATH, GUIDE_PATH, prepareLink } = await loadModules(basePath);

    expect(prepareLink(EXPLORE_PATH)).toBe(explorePath);
    expect(prepareLink(GUIDE_PATH)).toBe(guidePath);
  });

  it.each([
    ['no base path', '', `/?${OVERLAY_QUERY}&group=g1`],
    ['a base path', '/landscape', `/landscape/?${OVERLAY_QUERY}&group=g1`],
  ])('merges the overlay params and the extra query under %s', async (_, basePath, expected) => {
    mockGetUrlParams.mockReturnValue(OVERLAY_QUERY);
    const { EXPLORE_PATH, prepareLink } = await loadModules(basePath);

    expect(prepareLink(EXPLORE_PATH, 'group=g1')).toBe(expected);
  });

  it('never produces a double slash before the query', async () => {
    for (const basePath of ['', '/landscape']) {
      for (const overlayQuery of ['', OVERLAY_QUERY]) {
        for (const extraQuery of [undefined, '', 'group=g1']) {
          // Load the modules for this combination
          vi.resetModules();
          mockGetUrlParams.mockReturnValue(overlayQuery);
          const { EMBED_SETUP_PATH, EXPLORE_PATH, prepareLink } = await loadModules(basePath);

          // Verify no link has a double slash
          expect(prepareLink(EXPLORE_PATH, extraQuery)).not.toContain('//');
          expect(prepareLink(EMBED_SETUP_PATH, extraQuery)).not.toContain('//');
        }
      }
    }
  });
});

// Helpers.

/** Loads fresh path constants and `prepareLink` for a landscape served under the base path provided. */
const loadModules = async (basePath: string) => {
  window.baseDS = createBaseData(basePath === '' ? {} : { base_path: basePath });
  const data = await import('../../data');
  const { default: prepareLink } = await import('../prepareLink');

  return { ...data, prepareLink };
};
