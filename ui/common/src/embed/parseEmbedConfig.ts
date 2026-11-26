import { parseBasePath } from './isValidBasePath';
import { buildMultiCategoryKey } from './keys';
import {
  Alignment,
  BASE_PATH_PARAM,
  CATEGORIES_PARAM,
  CLASSIFY_BY_PARAM,
  ClassifyType,
  DEFAULT_CLASSIFY_TYPE,
  DEFAULT_DISPLAY_CATEGORY_HEADER,
  DEFAULT_DISPLAY_CATEGORY_IN_SUBCATEGORY,
  DEFAULT_DISPLAY_ITEM_MODAL,
  DEFAULT_DISPLAY_ITEM_NAME,
  DEFAULT_HIDE_ORGANIZATION_SECTION,
  DEFAULT_ITEM_NAME_SIZE,
  DEFAULT_ITEMS_ALIGNMENT,
  DEFAULT_ITEMS_SIZE,
  DEFAULT_ITEMS_STYLE_VIEW,
  DEFAULT_TITLE_ALIGNMENT,
  DEFAULT_TITLE_BG_COLOR,
  DEFAULT_TITLE_FG_COLOR,
  DEFAULT_TITLE_FONT_FAMILY,
  DEFAULT_TITLE_SIZE,
  DEFAULT_UPPERCASE_TITLE,
  DISPLAY_CATEGORY_IN_SUBCATEGORY_PARAM,
  DISPLAY_HEADER_CATEGORY_PARAM,
  DISPLAY_HEADER_PARAM,
  DISPLAY_ITEM_MODAL_PARAM,
  DISPLAY_ITEM_NAME_PARAM,
  FontFamily,
  HIDE_ORGANIZATION_SECTION_PARAM,
  ITEM_NAME_SIZE_PARAM,
  ITEM_NAME_SIZE_RANGE,
  ITEMS_ALIGNMENT_PARAM,
  ITEMS_SIZE_PARAM,
  ITEMS_SPACING_PARAM,
  ITEMS_STYLE_PARAM,
  KEY_PARAM,
  Size,
  Style,
  SUBCATEGORIES_PARAM,
  TITLE_ALIGNMENT_PARAM,
  TITLE_BGCOLOR_PARAM,
  TITLE_FGCOLOR_PARAM,
  TITLE_FONT_FAMILY_PARAM,
  TITLE_SIZE_PARAM,
  TITLE_SIZE_RANGE,
  UPPERCASE_TITLE_PARAM,
} from './params';

// Value of the title background color param that makes the titles transparent
const TRANSPARENT_BG_COLOR = 'transparent';

/** Configuration of an embed view, read from its url params. */
export interface EmbedConfig {
  /** Validated landscape base path, without trailing slashes (`''` when not set). */
  readonly basePath: string;
  /** Deduplicated categories of the view (only for the category classification). */
  readonly categories: readonly string[];
  readonly classifyBy: ClassifyType;
  readonly displayCategoryInSubcategory: boolean;
  readonly displayCategoryTitle: boolean;
  readonly displayHeader: boolean;
  readonly displayItemModal: boolean;
  readonly displayItemName: boolean;
  /** Only set when the item modal is displayed. */
  readonly hideOrganizationSection: boolean;
  readonly isBgTransparent: boolean;
  readonly itemNameSize: number;
  readonly itemsAlignment: Alignment;
  readonly itemsSize: Size;
  readonly itemsStyle: Style;
  /**
   * Embed key of the view: the `key` param, else the only category, else the
   * categories joined with `__` (multi-category views).
   */
  readonly key: string;
  /** Deduplicated subcategories selected in a single category view. */
  readonly subcategories: readonly string[];
  readonly titleAlignment: Alignment;
  readonly titleBgColor: string;
  readonly titleFgColor: string;
  readonly titleFontFamily: FontFamily;
  readonly titleSize: number;
  readonly uppercaseTitle: boolean;
  /** Custom gap between items in pixels (the size default when not set). */
  readonly itemsSpacing?: number;
}

/**
 * Reads the configuration of an embed view from its url query string.
 *
 * A missing param takes its default. Out of range sizes, negative or invalid
 * spacing and unknown alignments or font families are ignored, as are the
 * item name size without `item-name` and `hide-organization-section` without
 * `item-modal`.
 *
 * @param search - Query string of the embed url (e.g. `location.search`)
 * @returns The configuration, or `null` when the url is invalid: an invalid
 *   `style`, `size`, `classify` or `base-path` value, or no key or categories
 */
export const parseEmbedConfig = (search: string): EmbedConfig | null => {
  const params = new URLSearchParams(search);

  const basePath = parseBasePath(params.get(BASE_PATH_PARAM));
  const classifyByParam = parseEnum(params.get(CLASSIFY_BY_PARAM), ClassifyType);
  const itemsStyleParam = parseEnum(params.get(ITEMS_STYLE_PARAM), Style);
  const itemsSizeParam = parseEnum(params.get(ITEMS_SIZE_PARAM), Size);
  if (basePath === null || classifyByParam === null || itemsStyleParam === null || itemsSizeParam === null) {
    return null;
  }
  const classifyBy = classifyByParam ?? DEFAULT_CLASSIFY_TYPE;

  const isCategoryView = classifyBy === ClassifyType.Category;
  const categories = isCategoryView ? parseList(params.get(CATEGORIES_PARAM)) : [];
  const isMultiCategoryView = categories.length > 1;
  const keyParam = params.get(KEY_PARAM);
  const key = isMultiCategoryView ? buildMultiCategoryKey(categories) : (keyParam ?? categories[0]);
  if (key === undefined || key === '') return null;

  const displayItemModal = parseBoolean(params.get(DISPLAY_ITEM_MODAL_PARAM), DEFAULT_DISPLAY_ITEM_MODAL);
  const displayItemName = parseBoolean(params.get(DISPLAY_ITEM_NAME_PARAM), DEFAULT_DISPLAY_ITEM_NAME);
  const titleBgColor = params.get(TITLE_BGCOLOR_PARAM) ?? DEFAULT_TITLE_BG_COLOR;

  return {
    basePath,
    categories,
    classifyBy,
    displayCategoryInSubcategory: parseBoolean(
      params.get(DISPLAY_CATEGORY_IN_SUBCATEGORY_PARAM),
      DEFAULT_DISPLAY_CATEGORY_IN_SUBCATEGORY
    ),
    displayCategoryTitle: parseBoolean(params.get(DISPLAY_HEADER_CATEGORY_PARAM), DEFAULT_DISPLAY_CATEGORY_HEADER),
    // The embed setup always sets `headers`, and a url without it has always shown no headers
    displayHeader: params.get(DISPLAY_HEADER_PARAM) === 'true',
    displayItemModal,
    displayItemName,
    hideOrganizationSection:
      displayItemModal && parseBoolean(params.get(HIDE_ORGANIZATION_SECTION_PARAM), DEFAULT_HIDE_ORGANIZATION_SECTION),
    isBgTransparent: titleBgColor === TRANSPARENT_BG_COLOR,
    itemNameSize: displayItemName
      ? parseSize(params.get(ITEM_NAME_SIZE_PARAM), ITEM_NAME_SIZE_RANGE, DEFAULT_ITEM_NAME_SIZE)
      : DEFAULT_ITEM_NAME_SIZE,
    itemsAlignment: parseEnum(params.get(ITEMS_ALIGNMENT_PARAM), Alignment) ?? DEFAULT_ITEMS_ALIGNMENT,
    itemsSize: itemsSizeParam ?? DEFAULT_ITEMS_SIZE,
    itemsStyle: itemsStyleParam ?? DEFAULT_ITEMS_STYLE_VIEW,
    key,
    subcategories:
      isCategoryView && !isMultiCategoryView && keyParam !== null ? parseList(params.get(SUBCATEGORIES_PARAM)) : [],
    titleAlignment: parseEnum(params.get(TITLE_ALIGNMENT_PARAM), Alignment) ?? DEFAULT_TITLE_ALIGNMENT,
    titleBgColor,
    titleFgColor: params.get(TITLE_FGCOLOR_PARAM) ?? DEFAULT_TITLE_FG_COLOR,
    titleFontFamily: parseEnum(params.get(TITLE_FONT_FAMILY_PARAM), FontFamily) ?? DEFAULT_TITLE_FONT_FAMILY,
    titleSize: parseSize(params.get(TITLE_SIZE_PARAM), TITLE_SIZE_RANGE, DEFAULT_TITLE_SIZE),
    uppercaseTitle: parseBoolean(params.get(UPPERCASE_TITLE_PARAM), DEFAULT_UPPERCASE_TITLE),
    ...parseSpacing(params.get(ITEMS_SPACING_PARAM)),
  };
};

/** Reads a boolean param: `true` is the only true value, and a missing param takes the default. */
const parseBoolean = (value: string | null, defaultValue: boolean): boolean =>
  value === null ? defaultValue : value === 'true';

/**
 * Reads an enum param.
 *
 * @returns The enum value, `undefined` when the param is missing, or `null`
 *   when its value is not one of the enum values
 */
const parseEnum = <T extends string>(value: string | null, values: Record<string, T>): T | null | undefined => {
  if (value === null) return undefined;
  return (Object.values(values) as string[]).includes(value) ? (value as T) : null;
};

/** Reads a comma separated list param, trimming the entries and dropping the blank and repeated ones. */
const parseList = (value: string | null): string[] => {
  if (value === null) return [];
  const entries = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
  return Array.from(new Set(entries));
};

/** Reads a font size param, ignoring missing, invalid and out of range values. */
const parseSize = (value: string | null, range: { max: number; min: number }, defaultValue: number): number => {
  if (value === null) return defaultValue;
  const size = parseInt(value, 10);
  return size >= range.min && size <= range.max ? size : defaultValue;
};

/** Reads the items spacing param, ignoring missing, invalid and negative values. */
const parseSpacing = (value: string | null): { itemsSpacing?: number } => {
  if (value === null) return {};
  const spacing = parseInt(value, 10);
  return spacing >= 0 ? { itemsSpacing: spacing } : {};
};
