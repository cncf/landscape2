import { Breakpoint, FilterCategory, FilterSection, ViewMode } from './types';

export const VIEW_MODE_PARAM = 'view-mode';
export const GROUP_PARAM = 'group';
export const MODAL_PARAM = 'modal';
export const ITEM_PARAM = 'item';
export const CATEGORY_PARAM = 'category';
export const SUBCATEGORY_PARAM = 'subcategory';

export const DEFAULT_ZOOM_LEVELS = {
  [Breakpoint.XXL]: 5,
  [Breakpoint.XL]: 4,
  [Breakpoint.LG]: 3,
  [Breakpoint.MD]: 2,
  [Breakpoint.SM]: 1,
  [Breakpoint.XS]: 0,
};
export const DEFAULT_VIEW_MODE = ViewMode.Grid;

export const ZOOM_LEVELS = [
  [25, 23],
  [30, 25],
  [35, 30],
  [40, 35],
  [45, 40],
  [50, 45],
  [55, 42],
  [60, 50],
  [65, 54],
  [70, 58],
  [75, 60],
];

export const COLORS: string[] = ['rgba(1, 107, 204, 0.70)', 'rgba(0, 42, 81, 0.70)'];

export const FILTERS: FilterSection[] = [
  {
    value: FilterCategory.Project,
    title: 'Project',
    options: [
      {
        value: 'cncf',
        name: 'CNCF Projects',
        suboptions: [
          {
            value: 'graduated',
            name: 'Graduated',
          },
          {
            value: 'incubating',
            name: 'Incubating',
          },
          {
            value: 'sandbox',
            name: 'Sandbox',
          },
          {
            value: 'archived',
            name: 'Archived',
          },
        ],
      },
      {
        value: 'non-cncf',
        name: 'Non CNCF Projects',
      },
    ],
  },
];
