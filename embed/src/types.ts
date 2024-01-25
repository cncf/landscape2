export const KEY_PARAM = 'key';
export const DISPLAY_HEADER_PARAM = 'headers';
export const STYLE_PARAM = 'style';
export const SIZE_PARAM = 'size';
export const BGCOLOR_PARAM = 'bg-color';
export const FGCOLOR_PARAM = 'fg-color';

export interface Data {
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
  id: string;
  category: string;
  oss?: boolean;
  name: string;
  logo: string;
  subcategory: string;
  description?: string;
  maturity?: string;
  tag?: string;
}

export enum Style {
  Basic = 'clean',
  BorderedBasic = 'bordered',
  ShadowedBasic = 'shadowed',
}

export enum Size {
  XSmall = 'xs',
  Small = 'sm',
  Medium = 'md',
  Large = 'lg',
  XLarge = 'xl',
}

export const DEFAULT_DISPLAY_HEADER = true;
export const DEFAULT_STYLE_VIEW = Style.ShadowedBasic;
export const DEFAULT_SIZE = Size.Medium;
export const DEFAULT_BG_COLOR = '#323437';
export const DEFAULT_FG_COLOR = '#ffffff';
