import type { OverlayData as OverlayDataResult } from 'common';
import { baseFixture, fullFixture, gamesFixture, statsFixture } from 'common/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { overrideSettings } from '../../data';
import itemsDataGetter from '../itemsDataGetter';
import { OverlayData } from '../overlayData';

const { mockGetOverlayData } = vi.hoisted(() => ({
  mockGetOverlayData: vi.fn<(input: unknown) => Promise<string>>(),
}));

vi.mock('../../../wasm/overlay/landscape2_overlay', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  get_overlay_data: mockGetOverlayData,
}));
vi.mock('../../data', async (importOriginal) => ({
  ...(await importOriginal()),
  overrideSettings: vi.fn(),
}));
vi.mock('../itemsDataGetter', () => ({ default: { init: vi.fn() } }));

describe('OverlayData', () => {
  beforeEach(() => {
    window.guide = undefined;
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
    document.body.classList.remove('overlay-active');
  });

  it('stores quiz questions from overlay games', async () => {
    mockGetOverlayData.mockResolvedValue(JSON.stringify(overlayResult({ games: gamesFixture })));
    const overlayData = new OverlayData();

    // Load the overlay data
    const base = await overlayData.getOverlayBaseData();

    // Verify the quiz questions are kept for the quiz options
    expect(base).toEqual(baseFixture);
    expect(overlayData.getQuizQuestionsJson()).toBe(JSON.stringify(gamesFixture.quiz!.questions));
  });

  it('logs overlay warnings', async () => {
    const warnings = [
      'settings: unknown key `featured_item` (found once, at featured_item)',
      'item category--subcategory--item-3 not found in the deployed landscape: logo and CLOMonitor summary unavailable',
    ];
    mockGetOverlayData.mockResolvedValue(JSON.stringify(overlayResult({ warnings })));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const overlayData = new OverlayData();

    // Load the overlay data
    await overlayData.getOverlayBaseData();

    // Verify each warning is logged on its own
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenNthCalledWith(1, warnings[0]);
    expect(warnSpy).toHaveBeenNthCalledWith(2, warnings[1]);
  });

  it('overrides the settings before initializing the full data', async () => {
    mockGetOverlayData.mockResolvedValue(JSON.stringify(overlayResult()));
    const overlayData = new OverlayData();

    // Load the overlay data
    await overlayData.getOverlayBaseData();

    // Verify the full data subscribers are notified with the overlay settings already applied
    const overrideSettingsMock = vi.mocked(overrideSettings);
    const initMock = vi.mocked(itemsDataGetter.init);
    expect(initMock).toHaveBeenCalledWith(fullFixture);
    expect(overrideSettingsMock).toHaveBeenCalledTimes(1);
    expect(overrideSettingsMock.mock.invocationCallOrder[0]).toBeLessThan(initMock.mock.invocationCallOrder[0]);
  });

  it('keeps only the overlay params of the URL', () => {
    window.history.replaceState(
      null,
      '',
      '/?group=g1&overlay-data=https://a.example/data.yml&item=x&overlay-settings=https://a.example/settings.yml' +
        '&overlay-guide=https://a.example/guide.yml&overlay-logos=https://a.example/logos&overlay-games=https://a.example/games.yml'
    );
    const overlayData = new OverlayData();

    // Detect the overlay in the URL
    expect(overlayData.checkIfOverlayInQuery()).toBe(true);

    // Verify only the overlay params are kept
    expect(Object.fromEntries(new URLSearchParams(overlayData.getUrlParams()))).toEqual({
      'overlay-data': 'https://a.example/data.yml',
      'overlay-games': 'https://a.example/games.yml',
      'overlay-guide': 'https://a.example/guide.yml',
      'overlay-logos': 'https://a.example/logos',
      'overlay-settings': 'https://a.example/settings.yml',
    });
  });

  it('is inactive and keeps no params when the URL has no overlay params', () => {
    window.history.replaceState(null, '', '/?group=g1&item=x');
    const overlayData = new OverlayData();

    expect(overlayData.checkIfOverlayInQuery()).toBe(false);
    expect(overlayData.isActiveOverlay()).toBe(false);
    expect(overlayData.getUrlParams()).toBe('');
  });

  it('returns no quiz questions when the overlay has no games', async () => {
    mockGetOverlayData.mockResolvedValue(JSON.stringify(overlayResult()));
    const overlayData = new OverlayData();

    // Load the overlay data
    await overlayData.getOverlayBaseData();

    // Verify there are no quiz questions and no guide
    expect(overlayData.getQuizQuestionsJson()).toBeUndefined();
    expect(window.guide).toBeUndefined();
  });
});

// Helpers.

/** Returns the overlay data built from the dataset fixtures, plus the overrides. */
const overlayResult = (overrides: Partial<OverlayDataResult> = {}): OverlayDataResult => ({
  datasets: { base: baseFixture, full: fullFixture, stats: statsFixture },
  ...overrides,
});
