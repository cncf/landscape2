export const KEY_PARAM = 'key';
export const DISPLAY_HEADER_PARAM = 'headers';
export const DISPLAY_HEADER_CATEGORY_PARAM = 'category-header';
export const DISPLAY_CATEGORY_IN_SUBCATEGORY_PARAM = 'category-in-subcategory';
export const UPPERCASE_TITLE_PARAM = 'title-uppercase';
export const TITLE_ALIGNMENT_PARAM = 'title-alignment';
export const TITLE_SIZE_PARAM = 'title-font-size';
export const TITLE_FONT_FAMILY_PARAM = 'title-font-family';
export const DISPLAY_ITEM_NAME_PARAM = 'item-name';
export const ITEM_NAME_SIZE_PARAM = 'item-name-font-size';
export const ITEMS_STYLE_PARAM = 'style';
export const ITEMS_SIZE_PARAM = 'size';
export const ITEMS_ALIGNMENT_PARAM = 'items-alignment';
export const ITEMS_SPACING_PARAM = 'items-spacing';
export const TITLE_BGCOLOR_PARAM = 'bg-color';
export const TITLE_FGCOLOR_PARAM = 'fg-color';
export const BASE_PATH_PARAM = 'base-path';
export const DISPLAY_ITEM_MODAL_PARAM = 'item-modal';

export interface Data {
  foundation: string;
  category: Category;
  items: BaseItem[];
}

export interface Category {
  name: string;
  normalized_name: string;
  subcategories: Subcategory[];
}

export interface Subcategory {
  name: string;
  normalized_name: string;
}

export interface BaseItem {
  additional_categories?: AdditionalCategory[];
  description?: string;
  category: string;
  id: string;
  logo: string;
  name: string;
  maturity?: string;
  member_subcategory?: string;
  organization_name?: string;
  subcategory: string;
  website?: string;
  primary_repository_url?: string;
}

export interface AdditionalCategory {
  category: string;
  subcategory: string;
}

export enum Style {
  Basic = 'clean',
  BorderedBasic = 'bordered',
  ShadowedBasic = 'shadowed',
  Card = 'card',
}

export enum Size {
  XSmall = 'xs',
  Small = 'sm',
  Medium = 'md',
  Large = 'lg',
  XLarge = 'xl',
}

export enum Alignment {
  Left = 'left',
  Center = 'center',
  Right = 'right',
}

export enum FontFamily {
  Serif = 'serif',
  SansSerif = 'sans-serif',
  Monospace = 'monospace',
}

export enum SVGIconKind {
  GitHubCircle,
  World,
}

export const DEFAULT_DISPLAY_HEADER = true;
export const DEFAULT_DISPLAY_CATEGORY_HEADER = true;
export const DEFAULT_DISPLAY_CATEGORY_IN_SUBCATEGORY = false;
export const DEFAULT_UPPERCASE_TITLE = false;
export const DEFAULT_TITLE_ALIGNMENT = Alignment.Left;
export const DEFAULT_TITLE_FONT_FAMILY = FontFamily.SansSerif;
export const DEFAULT_TITLE_SIZE = 13;
export const DEFAULT_DISPLAY_ITEM_NAME = false;
export const DEFAULT_ITEM_NAME_SIZE = 11;
export const DEFAULT_ITEMS_STYLE_VIEW = Style.ShadowedBasic;
export const DEFAULT_ITEMS_SIZE = Size.Medium;
export const DEFAULT_ITEMS_ALIGNMENT = Alignment.Left;
export const DEFAULT_ITEMS_SPACING = 15;
export const DEFAULT_TITLE_BG_COLOR = '#323437';
export const DEFAULT_TITLE_FG_COLOR = '#ffffff';
export const DEFAULT_DISPLAY_ITEM_MODAL = false;
