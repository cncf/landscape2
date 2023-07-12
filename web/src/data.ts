import { Breakpoint, FilterCategory, FilterSection, ViewMode } from './types';

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

export const ZOOM_LEVELS = [
  [25, 20],
  [30, 25],
  [35, 30],
  [40, 35],
  [45, 40],
  [50, 45],
  [55, 50],
  [60, 55],
  [65, 60],
  [70, 65],
  [75, 70],
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
      }
    ]
  },
];
