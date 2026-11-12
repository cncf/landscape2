// Names of the url params the embed views read, shared by the embed and the
// webapp embed setup.
export const BASE_PATH_PARAM = 'base-path';
export const CATEGORIES_PARAM = 'categories';
export const CLASSIFY_BY_PARAM = 'classify';
export const DISPLAY_CATEGORY_IN_SUBCATEGORY_PARAM = 'category-in-subcategory';
export const DISPLAY_HEADER_CATEGORY_PARAM = 'category-header';
export const DISPLAY_HEADER_PARAM = 'headers';
export const DISPLAY_ITEM_MODAL_PARAM = 'item-modal';
export const DISPLAY_ITEM_NAME_PARAM = 'item-name';
export const HIDE_ORGANIZATION_SECTION_PARAM = 'hide-organization-section';
export const ITEM_NAME_SIZE_PARAM = 'item-name-font-size';
export const ITEMS_ALIGNMENT_PARAM = 'items-alignment';
export const ITEMS_SIZE_PARAM = 'size';
export const ITEMS_SPACING_PARAM = 'items-spacing';
export const ITEMS_STYLE_PARAM = 'style';
export const KEY_PARAM = 'key';
export const SUBCATEGORIES_PARAM = 'subcategories';
export const TITLE_ALIGNMENT_PARAM = 'title-alignment';
export const TITLE_BGCOLOR_PARAM = 'bg-color';
export const TITLE_FGCOLOR_PARAM = 'fg-color';
export const TITLE_FONT_FAMILY_PARAM = 'title-font-family';
export const TITLE_SIZE_PARAM = 'title-font-size';
export const UPPERCASE_TITLE_PARAM = 'title-uppercase';

/** Alignment of the embed titles and items. */
export enum Alignment {
  Left = 'left',
  Center = 'center',
  Right = 'right',
}

/** Classification the embed view items are grouped by. */
export enum ClassifyType {
  Category = 'category',
  Maturity = 'maturity',
  TAG = 'tag',
}

/** Font family of the embed titles. */
export enum FontFamily {
  Serif = 'serif',
  SansSerif = 'sans-serif',
  Monospace = 'monospace',
}

/** Size of the embed items. */
export enum Size {
  XSmall = 'xs',
  Small = 'sm',
  Medium = 'md',
  Large = 'lg',
  XLarge = 'xl',
}

/** Style of the embed items. */
export enum Style {
  Basic = 'clean',
  BorderedBasic = 'bordered',
  ShadowedBasic = 'shadowed',
  Card = 'card',
}

// Values the embed views use when a param is not set.
export const DEFAULT_CLASSIFY_TYPE = ClassifyType.Category;
export const DEFAULT_DISPLAY_CATEGORY_HEADER = true;
export const DEFAULT_DISPLAY_CATEGORY_IN_SUBCATEGORY = false;
export const DEFAULT_DISPLAY_HEADER = true;
export const DEFAULT_DISPLAY_ITEM_MODAL = false;
export const DEFAULT_DISPLAY_ITEM_NAME = false;
export const DEFAULT_HIDE_ORGANIZATION_SECTION = false;
export const DEFAULT_ITEM_NAME_SIZE = 11;
export const DEFAULT_ITEMS_ALIGNMENT = Alignment.Left;
export const DEFAULT_ITEMS_SIZE = Size.Medium;
export const DEFAULT_ITEMS_SPACING = 15;
export const DEFAULT_ITEMS_STYLE_VIEW = Style.ShadowedBasic;
export const DEFAULT_TITLE_ALIGNMENT = Alignment.Left;
export const DEFAULT_TITLE_BG_COLOR = '#323437';
export const DEFAULT_TITLE_FG_COLOR = '#ffffff';
export const DEFAULT_TITLE_FONT_FAMILY = FontFamily.SansSerif;
export const DEFAULT_TITLE_SIZE = 13;
export const DEFAULT_UPPERCASE_TITLE = false;

// Accepted ranges of the font size params (inclusive).
export const ITEM_NAME_SIZE_RANGE = { max: 40, min: 10 } as const;
export const TITLE_SIZE_RANGE = { max: 60, min: 10 } as const;
