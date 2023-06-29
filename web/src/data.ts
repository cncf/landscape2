import { FilterCategory, FilterSection, ViewMode } from "./types";

export const VIEW_MODE_PARAM = 'view-mode';
export const GROUP_PARAM = 'group';
export const ZOOM_PARAM = 'zoom';
export const MODAL_PARAM = 'modal';
export const ITEM_PARAM = 'item';
export const CATEGORY_PARAM = 'category';
export const SUBCATEGORY_PARAM = 'subcategory';

export const DEFAULT_ZOOM_LEVEL = 5;
export const DEFAULT_VIEW_MODE = ViewMode.Grid;

export const ZOOM_LEVELS = [['25px', '23px'], ['30px', '25px'], ['35px', '30px'], ['40px', '35px'], ['45px', '40px'], ['50px', '45px'], ['55px', '42px'], ['60px', '50px'], ['65px', '54px'], ['70px', '58px'], ['75px', '60px']];


export const COLORS: string[] = [
  'rgba(1, 107, 204, 0.70)',
  'rgba(95, 94, 95, 0.65)',
];

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
            name: 'Graduated'
          },
          {
            value: 'incubating',
            name: 'Incubating'
          },
          {
            value: 'sandbox',
            name: 'Sandbox'
          },
          {
            value: 'archived',
            name: 'Archived'
          }
        ]
      },
      {
        value: 'non-cncf',
        name: 'Non CNCF Projects'
      }
    ]
  }
];

