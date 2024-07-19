import {
  Breakpoint,
  ClassifyOption,
  FilterCategoriesPerTitle,
  FilterCategory,
  FilterSection,
  FilterTitle,
  FinancesKind,
  GridItemsSize,
  SortDirection,
  SortOption,
  Tab,
  ViewMode,
  ZoomLevelsPerSize,
} from './types';
import getBasePath from './utils/getBasePath';
import getFoundationNameLabel from './utils/getFoundationNameLabel';

export const BASE_PATH = getBasePath();
export const EXPLORE_PATH = BASE_PATH === '' ? '/' : `${BASE_PATH}/`;
export const EMBED_SETUP_PATH = `${BASE_PATH}/embed-setup`;
export const STATS_PATH = `${BASE_PATH}/stats`;
export const GUIDE_PATH = `${BASE_PATH}/guide`;
export const FINANCES_PATH = `${BASE_PATH}/finances`;
export const PROJECTS_PATH = `${BASE_PATH}/projects`;
export const GAMES_PATH = `${BASE_PATH}/games`;
export const LOGOS_PREVIEW_PATH = `${BASE_PATH}/logos-preview`;
export const SCREENSHOTS_PATH = '/screenshot';

export const TAB_PARAM = 'tab';
export const VIEW_MODE_PARAM = 'view-mode';
export const GROUP_PARAM = 'group';
export const MODAL_PARAM = 'modal';
export const ITEM_PARAM = 'item';
export const CATEGORY_PARAM = 'category';
export const SUBCATEGORY_PARAM = 'subcategory';
export const PAGE_PARAM = 'page';
export const FINANCES_KIND_PARAM = 'kind';
export const CLASSIFY_PARAM = 'classify';
export const SORT_BY_PARAM = 'sort-by';
export const SORT_DIRECTION_PARAM = 'sort-direction';

// Overlay
export const OVERLAY_DATA_PARAM = 'overlay-data';
export const OVERLAY_SETTINGS_PARAM = 'overlay-settings';
export const OVERLAY_GUIDE_PARAM = 'overlay-guide';
export const OVERLAY_LOGOS_PATH_PARAM = 'overlay-logos';
export const OVERLAY_GAMES_PATH_PARAM = 'overlay-games';

export const REGEX_SPACE = / /g;
export const REGEX_PLUS = /\+/g;
export const REGEX_DASH = /-/g;
export const REGEX_UNDERSCORE = /_/g;
export const REGEX_URL = /^https?:\/\//;

export const DEFAULT_ZOOM_LEVELS = {
  [Breakpoint.XXXL]: 5,
  [Breakpoint.XXL]: 5,
  [Breakpoint.XL]: 4,
  [Breakpoint.LG]: 3,
  [Breakpoint.MD]: 2,
  [Breakpoint.SM]: 1,
  [Breakpoint.XS]: 0,
};

export const SMALL_DEVICES_BREAKPOINTS: Breakpoint[] = [Breakpoint.XS, Breakpoint.SM, Breakpoint.MD];
export const DEFAULT_STICKY_MOBILE_NAVBAR_HEIGHT = 50;
export const DEFAULT_STICKY_NAVBAR_HEIGHT = 72;
export const DEFAULT_TAB = Tab.Explore;
export let DEFAULT_VIEW_MODE: ViewMode = window.baseDS ? window.baseDS.view_mode || ViewMode.Grid : ViewMode.Grid;
export const DEFAULT_GRID_ITEMS_SIZE = GridItemsSize.Small;
export const DEFAULT_FINANCES_KIND = FinancesKind.Funding;
export const DEFAULT_CLASSIFY = ClassifyOption.Category;
export const DEFAULT_SORT = SortOption.Name;
export const DEFAULT_SORT_DIRECTION = SortDirection.Asc;
export const ALL_OPTION = 'all';

export let FOUNDATION = window.baseDS ? window.baseDS.foundation : '';
export let GRID_SIZE = window.baseDS
  ? window.baseDS.grid_items_size || DEFAULT_GRID_ITEMS_SIZE
  : DEFAULT_GRID_ITEMS_SIZE;

export const ZOOM_LEVELS_PER_SIZE: ZoomLevelsPerSize = {
  [GridItemsSize.Small]: [
    [25, 23],
    [30, 27],
    [35, 32],
    [40, 36],
    [46, 41],
    [50, 45],
    [55, 50],
    [60, 54],
    [65, 59],
    [70, 63],
    [75, 68],
  ],
  [GridItemsSize.Medium]: [
    [40, 36],
    [46, 41],
    [50, 45],
    [55, 50],
    [60, 54],
    [65, 59],
    [70, 63],
    [75, 68],
    [80, 72],
    [85, 77],
    [90, 81],
  ],
  [GridItemsSize.Large]: [
    [55, 50],
    [60, 54],
    [65, 59],
    [70, 63],
    [75, 68],
    [80, 72],
    [85, 77],
    [90, 81],
    [95, 85],
    [100, 90],
    [105, 94],
  ],
};

export let ZOOM_LEVELS = ZOOM_LEVELS_PER_SIZE[GRID_SIZE as GridItemsSize];

export const COLORS: string[] = ['var(--color5)', 'var(--color6)'];

export const COMMON_FILTERS: FilterSection[] = [
  {
    value: FilterCategory.License,
    title: 'License',
    options: [
      {
        value: 'non-oss',
        name: 'Not Open Source',
      },
      {
        value: 'oss',
        name: 'Open Source',
        suboptions: [],
      },
    ],
  },
  {
    value: FilterCategory.OrgType,
    title: 'Organization type',
    options: [
      {
        value: 'for_profit',
        name: 'For profit',
      },
      {
        value: 'non_profit',
        name: 'Not profit',
      },
    ],
  },
  {
    value: FilterCategory.Extra,
    title: 'Extra',
    options: [
      {
        value: 'specification',
        name: 'Specification',
      },
      {
        value: 'enduser',
        name: 'End user',
      },
    ],
  },
];
export let FILTERS: FilterSection[] = [
  {
    value: FilterCategory.Maturity,
    title: 'Project',
    options: [
      {
        value: getFoundationNameLabel(),
        name: `${FOUNDATION} Projects`,
        suboptions: [],
      },
      {
        value: `non-${getFoundationNameLabel()}`,
        name: `Not ${FOUNDATION} Projects`,
      },
    ],
  },
  ...COMMON_FILTERS,
];

export const FILTER_CATEGORIES_PER_TITLE: FilterCategoriesPerTitle = {
  [FilterTitle.Project]: [
    FilterCategory.Maturity,
    FilterCategory.TAG,
    FilterCategory.License,
    FilterCategory.Category,
    FilterCategory.Extra,
  ],
  [FilterTitle.Organization]: [
    FilterCategory.Organization,
    FilterCategory.OrgType,
    FilterCategory.Industry,
    FilterCategory.Country,
  ],
};

export const BANNER_ID = 'banner-event';
export const ITEM_VIEW = 'item-view';

export const SORT_OPTION_LABEL = {
  [SortOption.Name]: 'Name',
  [SortOption.Stars]: 'Stars',
  [SortOption.DateAdded]: 'Date added',
  [SortOption.Contributors]: 'Contributors',
  [SortOption.FirstCommit]: 'First commit',
  [SortOption.LatestCommit]: 'Latest commit',
  [SortOption.Funding]: 'Funding',
};

interface SettingsValue {
  foundationName: string;
  gridSize: GridItemsSize;
  viewMode: ViewMode;
}

export const overrideSettings = (values: SettingsValue) => {
  FOUNDATION = values.foundationName;
  GRID_SIZE = values.gridSize;
  DEFAULT_VIEW_MODE = values.viewMode;
  ZOOM_LEVELS = ZOOM_LEVELS_PER_SIZE[values.gridSize];
  FILTERS = [
    {
      value: FilterCategory.Maturity,
      title: 'Project',
      options: [
        {
          value: getFoundationNameLabel(),
          name: `${FOUNDATION} Projects`,
          suboptions: [],
        },
        {
          value: `non-${getFoundationNameLabel()}`,
          name: `Not ${FOUNDATION} Projects`,
        },
      ],
    },
    ...COMMON_FILTERS,
  ];
};
