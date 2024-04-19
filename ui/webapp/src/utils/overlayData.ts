import isEmpty from 'lodash/isEmpty';

import {
  BASE_PATH,
  DEFAULT_GRID_ITEMS_SIZE,
  DEFAULT_VIEW_MODE,
  OVERLAY_DATA_PARAM,
  OVERLAY_GUIDE_PARAM,
  OVERLAY_LOGOS_PATH_PARAM,
  OVERLAY_SETTINGS_PARAM,
  overrideSettings,
} from '../data';
import itemsDataGetter from './itemsDataGetter';

interface OverlayParams {
  data?: string;
  settings?: string;
  guide?: string;
  logosPath?: string;
}

interface OverlayInput {
  landscape_url: string;
  data_url?: string;
  settings_url?: string;
  guide_url?: string;
  logos_url?: string;
}

export class OverlayData {
  private isActive: boolean = false;
  private params: OverlayParams | undefined = undefined;
  private query: URLSearchParams = new URLSearchParams();

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

    this.params = {};

    // save url params
    if (dataUrl) {
      this.params.data = dataUrl;
      this.query.set(OVERLAY_DATA_PARAM, dataUrl || '');
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
  }

  public isActiveOverlay() {
    return this.isActive;
  }

  public getUrlParams() {
    return this.isActive ? this.query.toString() : '';
  }

  private isWasmSupported() {
    if (typeof WebAssembly !== 'undefined') {
      // WebAssembly is supported
      return true;
    } else {
      // WebAssembly is not supported
      return false;
    }
  }

  public async getOverlayBaseData() {
    if (!this.isWasmSupported()) {
      return Promise.reject('WebAssembly is not supported in this browser');
    } else {
      return import('../../wasm/overlay/landscape2_overlay')
        .then(async (obj) => {
          await obj.default();

          const input: OverlayInput = {
            landscape_url: `${import.meta.env.MODE === 'development' ? 'http://localhost:8000' : window.location.origin}${BASE_PATH}`,
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
          }

          const overlayData = await obj.get_overlay_data(input);

          const data = JSON.parse(overlayData);
          window.baseDS = data.datasets.base;
          window.statsDS = data.datasets.stats;
          window.guide = data.guide;
          itemsDataGetter.init(data.datasets.full);
          overrideSettings({
            foundationName: data.datasets.base.foundation || '',
            gridSize: data.datasets.base.grid_items_size || DEFAULT_GRID_ITEMS_SIZE,
            viewMode: data.datasets.base.view_mode || DEFAULT_VIEW_MODE,
          });

          return data.datasets.base;
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }
  }
}

const overlayData = new OverlayData();
export default overlayData;
