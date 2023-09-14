import { Breakpoint, FilterCategory, FilterSection, GridItemsSize, ViewMode, ZoomLevelsPerSize } from './types';
import getFoundationNameLabel from './utils/getFoundationNameLabel';

export const VIEW_MODE_PARAM = 'view-mode';
export const GROUP_PARAM = 'group';
export const MODAL_PARAM = 'modal';
export const ITEM_PARAM = 'item';
export const CATEGORY_PARAM = 'category';
export const SUBCATEGORY_PARAM = 'subcategory';

export const DEFAULT_ZOOM_LEVELS = {
  [Breakpoint.XXXL]: 5,
  [Breakpoint.XXL]: 5,
  [Breakpoint.XL]: 4,
  [Breakpoint.LG]: 3,
  [Breakpoint.MD]: 2,
  [Breakpoint.SM]: 1,
  [Breakpoint.XS]: 0,
};

export const DEFAULT_VIEW_MODE = ViewMode.Grid;
export const DEFAULT_GRID_ITEMS_SIZE = GridItemsSize.Small;

const FOUNDATION = window.baseDS.foundation;
const GRID_SIZE = window.baseDS.grid_items_size || DEFAULT_GRID_ITEMS_SIZE;

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

export const ZOOM_LEVELS = ZOOM_LEVELS_PER_SIZE[GRID_SIZE as GridItemsSize];

export const COLORS: string[] = ['var(--color5)', 'var(--color6)'];

export const FILTERS: FilterSection[] = [
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
        name: `Non ${FOUNDATION} Projects`,
      },
    ],
  },
  {
    value: FilterCategory.CompanyType,
    title: 'Company type',
    options: [
      {
        value: 'for_profit',
        name: 'For profit',
      },
      {
        value: 'non_profit',
        name: 'Non profit',
      },
    ],
  },
];
