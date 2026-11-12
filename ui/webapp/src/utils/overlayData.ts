import type { OverlayData as OverlayDataResult, Question } from 'common';
import isEmpty from 'lodash/isEmpty';

import {
  BASE_PATH,
  DEFAULT_GRID_ITEMS_SIZE,
  DEFAULT_VIEW_MODE,
  OVERLAY_DATA_PARAM,
  OVERLAY_GAMES_PATH_PARAM,
  OVERLAY_GUIDE_PARAM,
  OVERLAY_LOGOS_PATH_PARAM,
  OVERLAY_SETTINGS_PARAM,
  overrideSettings,
} from '../data';
import getDevOrigin from './getDevOrigin';
import isWasmSupported from './isWasmSupported';
import itemsDataGetter from './itemsDataGetter';

interface OverlayParams {
  data?: string;
  settings?: string;
  guide?: string;
  logosPath?: string;
  gamesPath?: string;
}

interface OverlayInput {
  landscape_url: string;
  data_url?: string;
  settings_url?: string;
  guide_url?: string;
  logos_url?: string;
  games_url?: string;
}

/** Overlay mode state: the overlay URL params and the data built from them by the overlay wasm module. */
export class OverlayData {
  private isActive: boolean = false;
  private params: OverlayParams | undefined = undefined;
  private query: URLSearchParams = new URLSearchParams();
  private quizQuestions: Question[] | undefined = undefined;

  /** Checks whether the URL has overlay params, initializing the overlay mode when it does. */
  public checkIfOverlayInQuery() {
    const searchParams = new URLSearchParams(window.location.search);
    for (const [key] of searchParams.entries()) {
      if (key.startsWith('overlay-')) {
        this.init();
        return true;
      }
    }
    return false;
  }

  /** Turns the overlay mode on and keeps the overlay URL params. */
  public init() {
    this.isActive = true;
    document.body.classList.add('overlay-active');
    this.saveUrlParams();
  }

  private saveUrlParams() {
    const currentSearch = new URLSearchParams(window.location.search);
    const dataUrl = currentSearch.get(OVERLAY_DATA_PARAM);
    const settingsUrl = currentSearch.get(OVERLAY_SETTINGS_PARAM);
    const guideUrl = currentSearch.get(OVERLAY_GUIDE_PARAM);
    const logosPathUrl = currentSearch.get(OVERLAY_LOGOS_PATH_PARAM);
    const gamesPathUrl = currentSearch.get(OVERLAY_GAMES_PATH_PARAM);

    this.params = {};

    // save url params
    if (dataUrl) {
      this.params.data = dataUrl;
      this.query.set(OVERLAY_DATA_PARAM, dataUrl);
    }
    if (settingsUrl) {
      this.params.settings = settingsUrl;
      this.query.set(OVERLAY_SETTINGS_PARAM, settingsUrl);
    }
    if (guideUrl) {
      this.params.guide = guideUrl;
      this.query.set(OVERLAY_GUIDE_PARAM, guideUrl);
    }
    if (logosPathUrl) {
      this.params.logosPath = logosPathUrl;
      this.query.set(OVERLAY_LOGOS_PATH_PARAM, logosPathUrl);
    }
    if (gamesPathUrl) {
      this.params.gamesPath = gamesPathUrl;
      this.query.set(OVERLAY_GAMES_PATH_PARAM, gamesPathUrl);
    }
  }

  /** Checks whether the overlay mode is on. */
  public isActiveOverlay() {
    return this.isActive;
  }

  /** Returns the overlay URL params to keep in the app links (empty when the overlay mode is off). */
  public getUrlParams() {
    return this.isActive ? this.query.toString() : '';
  }

  /**
   * Returns the quiz questions of the overlay games as a JSON array, ready for
   * `QuizOptions`, or `undefined` when the overlay data has no quiz questions.
   */
  public getQuizQuestionsJson(): string | undefined {
    return this.quizQuestions ? JSON.stringify(this.quizQuestions) : undefined;
  }

  /** Builds the overlay datasets with the overlay wasm module, installs them and returns the base dataset. */
  public async getOverlayBaseData() {
    if (!isWasmSupported()) {
      return Promise.reject('WebAssembly is not supported in this browser');
    } else {
      return import('../../wasm/overlay/landscape2_overlay').then(async (obj) => {
        await obj.default();

        const input: OverlayInput = {
          landscape_url: `${getDevOrigin(window.location.origin)}${BASE_PATH}`,
        };

        if (!isEmpty(this.params)) {
          if (this.params.data) {
            input.data_url = this.params.data;
          }
          if (this.params.settings) {
            input.settings_url = this.params.settings;
          }
          if (this.params.guide) {
            input.guide_url = this.params.guide;
          }
          if (this.params.logosPath) {
            input.logos_url = this.params.logosPath;
          }
          if (this.params.gamesPath) {
            input.games_url = this.params.gamesPath;
          }
        }

        const overlayData = await obj.get_overlay_data(input);

        const data: OverlayDataResult = JSON.parse(overlayData);
        // Report the overlay issues (unmatched items, unknown keys) to the maintainer
        data.warnings?.forEach((warning) => console.warn(warning));
        window.baseDS = data.datasets.base;
        window.statsDS = data.datasets.stats;
        window.guide = data.guide;
        this.quizQuestions = data.games?.quiz?.questions;
        // The settings are overridden first, so the full data subscribers already read them
        overrideSettings({
          foundationName: data.datasets.base.foundation || '',
          gridSize: data.datasets.base.grid_items_size || DEFAULT_GRID_ITEMS_SIZE,
          viewMode: data.datasets.base.view_mode || DEFAULT_VIEW_MODE,
        });
        itemsDataGetter.init(data.datasets.full);

        return data.datasets.base;
      });
    }
  }
}

/** Shared overlay data instance. */
const overlayData = new OverlayData();
export default overlayData;
